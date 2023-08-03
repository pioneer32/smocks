#!/usr/bin/env node

import { Command } from 'commander';
import SmocksServer from './SmocksServer';
import path from 'node:path';
import fsSync, { constants as fsConstants, promises as fs } from 'node:fs';
import * as process from 'node:process';

const program = new Command();

const isPromiseLike = (val: any): val is PromiseLike<any> => val.then && typeof val.then === 'function';
const isFunction = (val: any): val is Function => val && typeof val === 'function';

program
  .name('smocks')
  .command('start')
  .description('Start Smocks Server')
  .option('-p, --port <port>', 'port to listen to for mock server requests (default: 3000)')
  // .option('-ap, --admin-port <port>', 'port to listen to for admin requests (default: 3001)')
  .option('--project-root <projectRoot>', 'the root directory where "collections.json" and routes are located (default: the current directory)')
  .option('-c, --config <configFile>', 'the path to the configuration file')
  .action((opts, _cmd) => {
    const defaultServerOptions = {
      port: 3000,
      projectRoot: process.cwd(),
    };
    (opts.config
      ? (async () => {
          const configFile = path.resolve(opts.config);
          fsSync.accessSync(configFile, fsConstants.R_OK);
          let config;
          switch (path.extname(configFile).toLowerCase()) {
            case '.js':
            case '.cjs':
            case '.json': {
              // @ts-ignore
              config = __non_webpack_require__(configFile);
              break;
            }
            case '.mjs':
              throw new Error('ESM config file is not supported yet. Sorry about that.');
            default:
              throw new Error('Unsupported config file format');
          }
          if (isPromiseLike(config)) {
            return await config;
          }
          if (isFunction(config)) {
            return await config();
          }
          return config;
        })()
      : Promise.resolve({})
    ).then((configFileOptions) => {
      const runOptions = { ...defaultServerOptions, ...configFileOptions };
      if (+opts.port && Number.isFinite(+opts.port)) {
        runOptions.port = +opts.port;
      }
      if (opts.projectRoot) {
        runOptions.projectRoot = path.resolve(opts.projectRoot);
      }
      const server = new SmocksServer(runOptions);
      return server.start();
    });
  });

program
  .command('init')
  .description('Initialise an empty Smocks Project')
  .action(async (_opts, _cmd) => {
    await fs.writeFile(
      './collections.json',
      JSON.stringify(
        [
          {
            id: 'base',
            routes: ['HOME:success', 'API:success'],
          },
          {
            id: 'unauthenticated',
            from: 'base',
            routes: ['API:unauthenticated'],
          },
        ],
        null,
        2
      )
    );

    await fs.mkdir('./routes');
    await fs.writeFile(
      './routes/home.ts',
      `import { RouteConfig } from '@pioneer32/smocks';

const routes: RouteConfig[] = [
  {
    id: 'HOME',
    url: '/',
    method: 'GET',
    variants: [
      {
        id: 'success',
        type: 'middleware',
        options: {
          async middleware(_req, res, next) {
            res.status(200);
            res.send(\`<!DOCTYPE html>
<html>
    <head>
        <title>Home Page</title>
    </head>
    <body>
        <h1>Welcome to Test Home Page</h1>
    </body>
</html>
\`);
            next();
          },
        },
      },
    ],
  },
];

export default routes;
      `
    );

    await fs.writeFile(
      './routes/api.ts',
      `import { RouteConfig } from '@pioneer32/smocks';

const routes: RouteConfig[] = [
  {
    id: 'API',
    url: '/api/user',
    method: 'GET',
    variants: [
      {
        id: 'success',
        type: 'json',
        options: {
          status: 200,
          body: {
              id: 1,
              email: 'foo@bar.baz',
          },
        },
      },
      {
        id: 'unauthenticated',
        type: 'json',
        options: {
          status: 401,
          body: {},
        },
      },
    ],
  },
];

export default routes;
      `
    );
  });

program.parse();

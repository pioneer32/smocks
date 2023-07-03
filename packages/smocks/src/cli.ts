#!/usr/bin/env node

import { Command } from 'commander';
import SmocksServer from './SmocksServer';
import { promises as fs } from 'fs';
import * as process from 'process';

const program = new Command();

program
  .name('smocks')
  .command('start')
  .description('Start Smocks Server')
  .option('-p, --port <port>', 'port to listen to for main requests', '3000')
  .option('-ap, --admin-port <port>', 'port to listen to for admin requests', '3001')
  .option('--project-root <projectRoot>', 'the root directory where "collections.json" and routes are located', process.cwd())
  .action((opts, _cmd) => {
    const server = new SmocksServer({ port: +opts.port, projectRoot: opts.projectRoot });
    server.start();
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

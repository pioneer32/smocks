import { Request } from 'express-serve-static-core';
import express, { Router } from 'express';
import BodyParser from 'body-parser';
import { getCurrentInvoke } from '@vendia/serverless-express';
import { promises as fs } from 'fs';
import { RawCollection, RouteConfig } from './types';
import InMemoryCollectionMapper from './InMemoryCollectionMapper';
import http from 'http';
import * as tsImport from 'ts-import';

const toConvenientRoutes = ({ id, from, routes }: RawCollection): Omit<RawCollection, 'routes'> & { routes: Record<string, string> } => ({
  id,
  ...(from ? { from } : {}),
  routes: Object.fromEntries(routes.map((route) => route.split(':'))),
});

type Options = {
  port: number;

  getMockSessionId: (request: Request) => Promise<string | undefined | void>;

  collectionMapper: {
    getCollectionName: (forSessionId: string) => Promise<string | undefined>;
    setCollectionName: (forSessionId: string, collectionName: string) => Promise<void>;
  };

  routesDir: string;
};

export type SmockServerOptions = Partial<Options>;

class SmocksServer {
  private opts: Options;

  private app = express();
  private adminApp = express();

  private server: http.Server | undefined;
  private adminServer: http.Server | undefined;

  constructor(options: SmockServerOptions = {}) {
    this.opts = {
      getMockSessionId: async () => 'default',
      collectionMapper: new InMemoryCollectionMapper(),
      routesDir: 'routes',
      port: 3000,
      ...options,
    };
    this.app.use(BodyParser.urlencoded({ extended: true }));
    this.app.use((req, res, next) => {
      res.on('finish', () => {
        // @ts-ignore
        const { event = {}, context = {} } = getCurrentInvoke();
        this.log(null, context.awsRequestId, `"${req.method.toUpperCase()} ${decodeURI(req.url)}" ${res.statusCode} ${res.statusMessage}`);
      });
      next();
    });
    this.app.all('*', async (req, res, next) => {
      // @ts-ignore
      const { event = {}, context = {} } = getCurrentInvoke();
      const router = express.Router() as Router;

      const sessionId = await this.opts.getMockSessionId(req);
      const collectionName = await this.getCollectionNameForSession(req);
      const collections = await this.loadCollections();
      const routes = await this.loadRoutes();

      if (!collections[collectionName]) {
        throw new Error(`No collection found for "${collectionName}"`);
      }

      this.log(null, context.awsRequestId, `For sessionId="${sessionId}" current collection="${collectionName}"`);
      Object.entries(collections[collectionName]).forEach(([name, variantName]) => {
        routes
          .filter(({ id, variants }) => id === name && variants.find(({ id }) => id === variantName))
          .forEach((route) => {
            router[route.method.toLowerCase() as 'get' | 'post' | 'put'](route.url, async (req, res) => {
              // @ts-ignore
              const { event = {}, context = {} } = getCurrentInvoke();

              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST,GET');
              const variant = route.variants.find(({ id }) => id === variantName);
              if (!variant) {
                res.statusCode = 404;
                res.send();
                return;
              }
              if (route.body) {
                route.body
              }
              if (variant.type === 'middleware') {
                this.log(name, context.awsRequestId, `${route.method} "${route.url}" -> Delegating to middleware...`);
                await variant.options.middleware(req, res, () => {});
                return;
              }
              this.log(name, context.awsRequestId, `${route.method} "${route.url}" -> Sending a static response...`);
              res.statusCode = variant.options.status;
              res.setHeader('Content-Type', 'application/json;charset=UTF-8');
              res.send(JSON.stringify(variant.options.body));
              return;
            });
          });
      });
      router(req, res, next);
    });
    this.adminApp.use(express.json());
    this.adminApp.use((req, res, next) => {
      res.on('finish', () => {
        this.log('ADMIN', null, `"${req.method.toUpperCase()} ${decodeURI(req.url)}" ${res.statusCode} ${res.statusMessage}`);
      });
      next();
    });
    this.adminApp.put('/session/:sessionId', (req, res, _next) => {
      const { collection } = req.body;
      const { sessionId } = req.params;
      this.log('ADMIN', null, `Setting sessionId="${sessionId}" to use collection="${collection}"`);
      this.opts.collectionMapper.setCollectionName(sessionId, collection).then(() => {
        res.statusCode = 200;
        res.send();
      });
    });
  }

  async start() {
    if (this.server) {
      throw new Error('Smocks is already running');
    }
    return Promise.all([
      new Promise<void>((res) => {
        this.server = this.app.listen(this.opts.port, () => {
          console.log(`Smocks is listening to ${this.opts.port}`);
          res();
        });
      }),
      new Promise<void>((res) => {
        this.adminServer = this.adminApp.listen(3001, () => {
          console.log(`Smocks ADMIN is listening to 3001`);
          res();
        });
      }),
    ]);
  }
  async stop() {
    if (!this.server) {
      throw new Error('Nothing to stop - not running');
    }
    await Promise.all([
      new Promise<void>((res) => {
        if (!this.server) {
          return res();
        }
        this.server.close((err) => {
          if (err) {
            console.error(err);
            return;
          }
          this.server = undefined;
          res();
        });
      }),
      new Promise<void>((res) => {
        if (!this.adminServer) {
          return res();
        }
        this.adminServer.close((err) => {
          if (err) {
            console.error(err);
            return;
          }
          this.adminServer = undefined;
          res();
        });
      }),
    ]);
    console.log('Smocks stopped');
  }

  private log(name: string | null, reqId: string | null, message: string) {
    console.log([`[${new Date().toISOString()}]`, reqId ? `[${reqId}]` : null, name ? `[${name}]` : null, message].filter(Boolean).join(' '));
  }

  private async getCollectionNameForSession(req: Request): Promise<string> {
    const sessionId = await this.opts.getMockSessionId(req);
    return (sessionId && (await this.opts.collectionMapper.getCollectionName(sessionId))) || 'base';
  }

  private async loadCollections(): Promise<Record<string, Record<string, string>>> {
    const rawCollections = JSON.parse((await fs.readFile('collections.json')).toString()) as RawCollection[];
    const collections = rawCollections.filter(({ from }) => !from).map(toConvenientRoutes);
    if (!collections.length) {
      throw new Error('There should be at least 1 collection that does not inherit from any other');
    }
    let pos = 0;
    while (pos < collections.length) {
      const { id, routes } = collections[pos];
      collections.push(
        ...rawCollections
          .filter(({ from }) => from === id)
          .map(toConvenientRoutes)
          .map((collection) => ({
            id: collection.id,
            routes: {
              ...routes,
              ...collection.routes,
            },
          }))
      );
      pos++;
    }
    return Object.fromEntries(collections.map(({ id, routes }) => [id, routes]));
  }

  private async loadRoutes(): Promise<RouteConfig[]> {
    const files = await fs.readdir(this.opts.routesDir);
    return (await Promise.all(files.map((filename) => tsImport.load(this.opts.routesDir + '/' + filename)))).map((m) => m.default).flat();
  }
}

export default SmocksServer;

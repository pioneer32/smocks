import * as core from 'express-serve-static-core';
import { Request } from 'express-serve-static-core';
import express, { Router } from 'express';
import BodyParser from 'body-parser';
import { getCurrentInvoke } from '@vendia/serverless-express';
import { promises as fs } from 'node:fs';
import DefaultGateway from 'default-gateway';
import IpAddr from 'ipaddr.js';
import os from 'node:os';
import Console from 'node:console';
import { AddressInfo } from 'net';
import * as tsImport from 'ts-import';
import http from 'http';

import { RawCollection, RouteConfig } from './types.js';
import InMemoryCollectionMapper from './InMemoryCollectionMapper.js';
import InMemoryStatsStorage from './InMemoryStatsStorage.js';

const toConvenientRoutes = ({ id, from, routes }: RawCollection): Omit<RawCollection, 'routes'> & { routes: Record<string, string> } => ({
  id,
  ...(from ? { from } : {}),
  routes: Object.fromEntries(routes.map((route) => route.split(':'))),
});

export interface ICollectionMapper {
  getCollectionName: (forSessionId: string) => Promise<string | undefined>;
  setCollectionName: (forSessionId: string, collectionName: string) => Promise<void>;
}

export interface IMemoryStatsStorage {
  setValue(key: string, value: string): Promise<void>;
  getValue(key: string): Promise<string | undefined>;
  removeValue(key: string): Promise<void>;
  getCollection(key: string): Promise<string[]>;
  appendCollection(key: string, value: string): Promise<void>;
  removeCollection(key: string): Promise<void>;
}

type Options = {
  port: number;
  type: 'http' | 'https';

  getMockSessionId: (request: Request) => Promise<string | undefined | void>;

  collectionMapper: ICollectionMapper;

  statsStorage: IMemoryStatsStorage;

  routesDir: string;
};

export type SmockServerOptions = Partial<Options>;

class SmocksServer {
  private opts: Options;

  private mockApp: core.Express;
  private adminApp: core.Express;

  private mockServer: http.Server | undefined;
  private adminServer: http.Server | undefined;

  constructor(options: SmockServerOptions = {}) {
    this.opts = {
      getMockSessionId: async () => 'default',
      collectionMapper: new InMemoryCollectionMapper(),
      statsStorage: new InMemoryStatsStorage(),
      routesDir: 'routes',
      port: 3000,
      type: 'http',
      ...options,
    };

    this.mockApp = this.createMockApp();
    this.adminApp = this.createAdminApp();
  }

  async start() {
    if (this.mockServer) {
      throw new Error('Smocks is already running');
    }
    await Promise.all([
      new Promise<void>((res) => {
        this.mockServer = this.mockApp.listen(this.opts.port, res);
      }),
      new Promise<void>((res) => {
        this.adminServer = this.adminApp.listen(3001, res);
      }),
    ]);

    this.print('info', `Smocks is running at:`);
    this.printServerUrlsFor(this.mockServer!, this.opts.type);
    this.print('info', `Smocks ADMIN is running at:`);
    this.printServerUrlsFor(this.adminServer!, this.opts.type);
  }
  async stop() {
    if (!this.mockServer) {
      throw new Error('Nothing to stop - Smocks is not running');
    }
    await Promise.all([
      new Promise<void>((res) => {
        if (!this.mockServer) {
          return res();
        }
        this.mockServer.close((err) => {
          if (err) {
            this.print('error', err);
            return;
          }
          this.mockServer = undefined;
          res();
        });
      }),
      new Promise<void>((res) => {
        if (!this.adminServer) {
          return res();
        }
        this.adminServer.close((err) => {
          if (err) {
            this.print('error', err);
            return;
          }
          this.adminServer = undefined;
          res();
        });
      }),
    ]);
    this.print('info', 'Smocks stopped');
  }

  getAdminServerURLs(): string[] {
    if (!this.adminServer) {
      throw new Error('Smocks is not running');
    }
    return this.getServerUrlsFor(this.adminServer!, this.opts.type);
  }

  getMockServerURLs(): string[] {
    if (!this.mockServer) {
      throw new Error('Smocks is not running');
    }
    return this.getServerUrlsFor(this.mockServer!, this.opts.type);
  }

  private printServerMessage(name: string | null, reqId: string | null, message: string) {
    this.print('info', [`[${new Date().toISOString()}]`, reqId ? `[${reqId}]` : null, name ? `[${name}]` : null, message].filter(Boolean).join(' '));
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
    return (await Promise.all(files.map((filename) => tsImport.load(this.opts.routesDir + '/' + filename, { compiledJsExtension: 'cjs' }))))
      .map((m) => m.default)
      .flat();
  }

  private printServerUrlsFor(server: http.Server, protocol: 'http' | 'https') {
    for (const url of this.getServerUrlsFor(server, protocol)) {
      this.print('info', `  ${url}`);
    }
  }

  private getServerUrlsFor(server: http.Server, protocol: 'http' | 'https'): string[] {
    const urls: string[] = [];
    const { address, port } = server.address() as AddressInfo;
    const parsedIP = IpAddr.parse(address);
    const prettyPrintURL = (hostname: string) => {
      let url = `${protocol}://${hostname}`;
      if (port) {
        url += `:${port}`;
      }
      return url + '/';
    };

    if (parsedIP.range() === 'unspecified') {
      urls.push(prettyPrintURL('localhost'));

      const networkIPv4 = this.internalIP('v4');
      if (networkIPv4) {
        urls.push(prettyPrintURL(networkIPv4));
      }
      const networkIPv6 = this.internalIP('v6');
      if (networkIPv6) {
        urls.push(prettyPrintURL(networkIPv6));
      }
    } else if (parsedIP.range() === 'loopback') {
      if (parsedIP.kind() === 'ipv4' || parsedIP.kind() === 'ipv6') {
        urls.push(prettyPrintURL(parsedIP.toString()));
      }
    } else {
      urls.push(
        parsedIP.kind() === 'ipv6' && (parsedIP as IpAddr.IPv6).isIPv4MappedAddress()
          ? prettyPrintURL((parsedIP as IpAddr.IPv6).toIPv4Address().toString())
          : prettyPrintURL(address)
      );
      if (parsedIP.kind() === 'ipv6') {
        urls.push(prettyPrintURL(address));
      }
    }
    return urls;
  }

  private internalIP(family: 'v4' | 'v6'): string | undefined {
    try {
      const { gateway } = family === 'v6' ? DefaultGateway.v6.sync() : DefaultGateway.v4.sync();
      const gatewayIp = IpAddr.parse(gateway);
      for (const addresses of Object.values(os.networkInterfaces()).filter(Boolean)) {
        for (const { cidr } of addresses!) {
          if (!cidr) {
            continue;
          }
          const net = IpAddr.parseCIDR(cidr);
          if (net[0] && net[0].kind() === gatewayIp.kind() && gatewayIp.match(net)) {
            return net[0].toString();
          }
        }
      }
    } catch (e) {}
    return undefined;
  }

  private print(level: 'info' | 'warn' | 'error', ...args: Parameters<typeof Console.log>) {
    switch (level) {
      case 'error':
        Console.error(...args);
        break;
      case 'warn':
        Console.warn(...args);
        break;
      case 'info':
        Console.log(...args);
        break;
    }
  }

  private createMockApp(): core.Express {
    const app = express();
    app.use(BodyParser.urlencoded({ extended: true }));
    app.use((req, res, next) => {
      res.on('finish', () => {
        // @ts-ignore
        const { event = {}, context = {} } = getCurrentInvoke();
        const sessionId = (req as any).mockSessionId;
        const collection = (req as any).mockCollectionName;
        const route = (req as any).mockRouteName;
        if (sessionId) {
          this.opts.statsStorage.appendCollection(
            `${sessionId}:requests`,
            JSON.stringify({
              timestamp: +new Date(),
              collection,
              route,
              request: {
                method: req.method,
                url: req.url,
              },
              response: {
                statusCode: res.statusCode,
              },
            })
          );
        }
        this.printServerMessage(
          null,
          context.awsRequestId,
          [
            `"${req.method.toUpperCase()} ${decodeURI(req.url)}" ${res.statusCode} ${res.statusMessage}`,
            '[' +
              [
                sessionId ? `session=${sessionId}` : '',
                collection ? `collection=${collection}` : '',
                route ? `route=${route}` : '',
                `type=${(req as any).mockType}`,
              ]
                .filter(Boolean)
                .join(' ') +
              ']',
          ]
            .filter(Boolean)
            .join(' ')
        );
      });
      next();
    });
    app.all('*', async (req, res, next) => {
      // @ts-ignore
      const { event = {}, context = {} } = getCurrentInvoke();
      const router = express.Router() as Router;

      (req as any).mockSessionId = await this.opts.getMockSessionId(req);
      const collectionName = await this.getCollectionNameForSession(req);
      (req as any).mockCollectionName = collectionName;
      const collections = await this.loadCollections();
      const routes = await this.loadRoutes();

      if (!collections[collectionName]) {
        throw new Error(`No collection found for "${collectionName}"`);
      }

      Object.entries(collections[collectionName]).forEach(([name, variantName]) => {
        routes
          .filter(({ id, variants }) => id === name && variants.find(({ id }) => id === variantName))
          .forEach((route) => {
            router[route.method.toLowerCase() as 'get' | 'post' | 'put'](route.url, async (req, res) => {
              (req as any).mockRouteName = `${name}:${variantName}`;
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
                route.body;
              }
              if (variant.type === 'middleware') {
                (req as any).mockType = 'middleware';
                await variant.options.middleware(req, res, () => {});
                return;
              }
              (req as any).mockType = 'static';
              res.statusCode = variant.options.status;
              res.setHeader('Content-Type', 'application/json;charset=UTF-8');
              res.send(JSON.stringify(variant.options.body));
              return;
            });
          });
      });
      router(req, res, next);
    });
    return app;
  }

  private createAdminApp(): core.Express {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      res.on('finish', () => {
        const adminAction = (req as any).mockAdminAction;
        this.printServerMessage('ADMIN', null, `"${req.method.toUpperCase()} ${decodeURI(req.url)}" ${res.statusCode} ${res.statusMessage} -> ${adminAction}`);
      });
      next();
    });
    app.put('/session/:sessionId', (req, res, _next) => {
      const { collection } = req.body;
      const { sessionId } = req.params;
      (req as any).mockAdminAction = `Set sessionId="${sessionId}" to use collection="${collection}"`;
      this.opts.collectionMapper.setCollectionName(sessionId, collection).then(() => {
        res.statusCode = 200;
        res.send();
      });
    });
    app.get('/session/:sessionId', (req, res, _next) => {
      const { sessionId } = req.params;
      (req as any).mockAdminAction = `Sent details of sessionId="${sessionId}"`;

      Promise.all([this.opts.collectionMapper.getCollectionName(sessionId), this.opts.statsStorage.getCollection(`${sessionId}:requests`)]).then(
        ([collectionName, requests]) => {
          res.statusCode = 200;
          // res.setHeader('Content-Type', 'application/json');
          res.json({
            collectionName,
            requests: requests.map((r) => JSON.parse(r)),
          });
        }
      );
    });
    app.delete('/session/:sessionId/requests', (req, res, _next) => {
      const { sessionId } = req.params;
      (req as any).mockAdminAction = `Cleaned the request log for sessionId="${sessionId}"`;
      this.opts.statsStorage.removeCollection(`${sessionId}:requests`).then(() => {
        res.statusCode = 200;
        res.send();
      });
    });
    return app;
  }
}

export default SmocksServer;

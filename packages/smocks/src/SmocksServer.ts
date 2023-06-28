import { Request } from 'express-serve-static-core';
import express, { Router } from 'express';
import BodyParser from 'body-parser';
import { getCurrentInvoke } from '@vendia/serverless-express';
import { promises as fs } from 'node:fs';
import DefaultGateway from 'default-gateway';
import IpAddr from 'ipaddr.js';
import Address from 'ipaddr.js';
import os from 'node:os';
import Console from 'node:console';

import { RawCollection, RouteConfig } from './types';
import InMemoryCollectionMapper from './InMemoryCollectionMapper';
import http from 'http';
import * as tsImport from 'ts-import';
import { AddressInfo } from 'net';

const toConvenientRoutes = ({ id, from, routes }: RawCollection): Omit<RawCollection, 'routes'> & { routes: Record<string, string> } => ({
  id,
  ...(from ? { from } : {}),
  routes: Object.fromEntries(routes.map((route) => route.split(':'))),
});

type Options = {
  port: number;
  type: 'http' | 'https';

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
      type: 'http',
      ...options,
    };
    this.app.use(BodyParser.urlencoded({ extended: true }));
    this.app.use((req, res, next) => {
      res.on('finish', () => {
        // @ts-ignore
        const { event = {}, context = {} } = getCurrentInvoke();
        const sessionId = (req as any).mockSessionId;
        const collectionName = (req as any).mockCollectionName;
        const routeName = (req as any).mockRouteName;
        this.printServerMessage(
          null,
          context.awsRequestId,
          [
            `"${req.method.toUpperCase()} ${decodeURI(req.url)}" ${res.statusCode} ${res.statusMessage}`,
            '[' +
              [
                sessionId ? `session=${sessionId}` : '',
                collectionName ? `collection=${collectionName}` : '',
                routeName ? `route=${routeName}` : '',
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
    this.app.all('*', async (req, res, next) => {
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
    this.adminApp.use(express.json());
    this.adminApp.use((req, res, next) => {
      res.on('finish', () => {
        const adminAction = (req as any).mockAdminAction;
        this.printServerMessage('ADMIN', null, `"${req.method.toUpperCase()} ${decodeURI(req.url)}" ${res.statusCode} ${res.statusMessage} -> ${adminAction}`);
      });
      next();
    });
    this.adminApp.put('/session/:sessionId', (req, res, _next) => {
      const { collection } = req.body;
      const { sessionId } = req.params;
      (req as any).mockAdminAction = `Set sessionId="${sessionId}" to use collection="${collection}"`;
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
    await Promise.all([
      new Promise<void>((res) => {
        this.server = this.app.listen(this.opts.port, res);
      }),
      new Promise<void>((res) => {
        this.adminServer = this.adminApp.listen(3001, res);
      }),
    ]);

    this.print('info', `Smocks is running at:`);
    await this.dumpSeverUrls(this.server!, this.opts.type);
    this.print('info', `Smocks ADMIN is running at:`);
    await this.dumpSeverUrls(this.adminServer!, this.opts.type);
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
            this.print('error', err);
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

  private async dumpSeverUrls(server: http.Server, protocol: 'http' | 'https') {
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
      this.print('info', `\tLoopback: ${prettyPrintURL('localhost')}`);

      const networkIPv4 = await this.internalIP('v4');
      if (networkIPv4) {
        this.print('info', `\tOn Your Network (IPv4): ${prettyPrintURL(networkIPv4)}`);
      }
      const networkIPv6 = await this.internalIP('v6');
      if (networkIPv6) {
        this.print('info', `\tOn Your Network (IPv6): ${prettyPrintURL(networkIPv6)}`);
      }
    } else if (parsedIP.range() === 'loopback') {
      if (parsedIP.kind() === 'ipv4' || parsedIP.kind() === 'ipv6') {
        this.print('info', `\tLoopback: ${prettyPrintURL(parsedIP.toString())}`);
      }
    } else {
      this.print(
        'info',
        `\tOn Your Network (IPv4): ${
          parsedIP.kind() === 'ipv6' && (parsedIP as Address.IPv6).isIPv4MappedAddress()
            ? prettyPrintURL((parsedIP as Address.IPv6).toIPv4Address().toString())
            : prettyPrintURL(address)
        }`
      );
      if (parsedIP.kind() === 'ipv6') {
        this.print('info', `\tOn Your Network (IPv6): ${prettyPrintURL(address)}`);
      }
    }
  }

  private async internalIP(family: 'v4' | 'v6'): Promise<string | undefined> {
    try {
      const { gateway } = await (family === 'v6' ? DefaultGateway.gateway6async() : DefaultGateway.gateway4async());
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
}

export default SmocksServer;

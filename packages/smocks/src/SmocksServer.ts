import * as core from 'express-serve-static-core';
import { promises as fs } from 'node:fs';
import DefaultGateway from 'default-gateway';
import IpAddr from 'ipaddr.js';
import os from 'node:os';
import Console from 'node:console';
import { AddressInfo } from 'net';
import { load } from './loader.js';
import { dirExistsSync, fileExistsSync } from './utils.js';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

import { RawCollection, RouteConfig, SmockServerOptions } from './types.js';
import InMemoryCollectionMapper from './InMemoryCollectionMapper.js';
import InMemoryStatsStorage from './InMemoryStatsStorage.js';
import { createAdminApp } from './adminApp.js';
import { createMockApp } from './mockApp.js';

const DEFAULT_COLLECTION = 'base';
const DEFAULT_DELAY = 0;

const toConvenientRoutes = ({ id, from, routes }: RawCollection): Omit<RawCollection, 'routes'> & { routes: Record<string, string> } => ({
  id,
  ...(from ? { from } : {}),
  routes: Object.fromEntries(routes.map((route) => route.split(':'))),
});

export interface ICollectionMapper {
  /**
   * @description Returns the current collection name for the given session id
   */
  getCollectionName: (forSessionId: string) => Promise<string | undefined>;

  /**
   * @description Sets the current collection name for the given session id
   */
  setCollectionName: (forSessionId: string, collectionName: string) => Promise<void>;

  /**
   * @description Returns overrides {[ROUTE_NAME]:VARIANT} for the given session id
   */
  getOverrides?: (forSessionId: string) => Promise<Record<string, string> | undefined>;

  /**
   * @description Sets overrides {[ROUTE_NAME]:VARIANT} for the given session id
   */
  setOverrides?: (forSessionId: string, overrides: Record<string, string | undefined>) => Promise<void>;
}

export interface IStatsStorage {
  setValue(key: string, value: string): Promise<void>;
  getValue(key: string): Promise<string | undefined>;
  removeValue(key: string): Promise<void>;
  getCollection(key: string): Promise<string[]>;
  appendCollection(key: string, value: string): Promise<void>;
  removeCollection(key: string): Promise<void>;
}

type Options = Required<SmockServerOptions>;

class SmocksServer {
  private opts: Options;

  private mockApp: core.Express;
  private adminApp: core.Express;

  private mockServer: http.Server | https.Server | undefined;
  private adminServer: http.Server | https.Server | undefined;

  constructor(options: SmockServerOptions & Pick<Options, 'projectRoot'>) {
    this.opts = {
      getMockSessionId: async () => 'default',
      collectionMapper: new InMemoryCollectionMapper(),
      statsStorage: new InMemoryStatsStorage(),
      port: 3000,
      https: false,
      cors: true,
      defaultCollection: options.defaultCollection || DEFAULT_COLLECTION,
      defaultDelay: options.defaultDelay || DEFAULT_DELAY,
      ...options,
    };

    if (!fileExistsSync(this.getCollectionFilePath())) {
      throw new Error(`The collection file is not accessible (${this.getCollectionFilePath()})`);
    }

    if (!dirExistsSync(this.getRouteFolderPath())) {
      throw new Error(`The route's directory is not accessible (${this.getRouteFolderPath()})`);
    }

    this.mockApp = createMockApp({
      loadCollections: () => this.loadCollections(),
      getOpts: () => ({ ...this.opts, getMockSessionId: async (req) => (await this.opts.getMockSessionId(req)) || 'default' }),
      loadRoutes: () => this.loadRoutes(),
      log: (requestId, message) => this.printServerMessage(null, requestId, message),
      getCollectionMapper: () => this.opts.collectionMapper,
      getStatsStorage: () => this.opts.statsStorage,
      getFixtureFolderPath: () => this.getFixtureFolderPath(),
    });
    this.adminApp = createAdminApp({
      getStatsStorage: () => this.opts.statsStorage,
      getCollectionMapper: () => this.opts.collectionMapper,
      log: (name, message) => this.printServerMessage(name, null, message),
    });
  }

  async start() {
    if (this.mockServer) {
      throw new Error('Smocks is already running');
    }
    await Promise.all([
      new Promise<void>((res) => {
        this.mockServer = this.opts.https ? https.createServer({ ...this.opts.https }, this.mockApp) : http.createServer(this.mockApp);
        this.mockServer.listen(this.opts.port, res);
      }),
      new Promise<void>((res) => {
        this.adminServer = this.opts.https ? https.createServer({ ...this.opts.https }, this.adminApp) : http.createServer(this.adminApp);
        this.adminServer.listen(3001, res);
      }),
    ]);

    this.print('info', `Smocks is running at:`);
    this.printServerUrlsFor(this.mockServer!);
    this.print('info', `Smocks ADMIN is running at:`);
    this.printServerUrlsFor(this.adminServer!);
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
    return this.getServerUrlsFor(this.adminServer!);
  }

  getMockServerURLs(): string[] {
    if (!this.mockServer) {
      throw new Error('Smocks is not running');
    }
    return this.getServerUrlsFor(this.mockServer!);
  }

  private getCollectionFilePath(): string {
    return path.resolve(this.opts.projectRoot, 'collections.json');
  }

  private getRouteFolderPath(): string {
    return path.resolve(this.opts.projectRoot, 'routes');
  }

  private getFixtureFolderPath(): string {
    return path.resolve(this.opts.projectRoot, '__fixtures__');
  }

  private printServerMessage(name: string | null, reqId: string | null, message: string) {
    this.print('info', [`[${new Date().toISOString()}]`, reqId ? `[${reqId}]` : null, name ? `[${name}]` : null, message].filter(Boolean).join(' '));
  }

  private async loadCollections(): Promise<Record<string, Record<string, string>>> {
    const rawCollections = JSON.parse((await fs.readFile(this.getCollectionFilePath())).toString()) as RawCollection[];
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
    const dir = this.getRouteFolderPath();
    const files = await fs.readdir(dir);
    return (
      await Promise.all(
        files
          .filter((filename) => filename.match(/.[cm]?[jt]sx?$/i))
          .map((filename) =>
            load(dir + '/' + filename, {
              cacheDir: path.join(this.opts.projectRoot, `.cache`),
            })
          )
      )
    )
      .map((m) => m.default)
      .filter(Boolean) // to prevent it from crashing, should there be an empty ts/js file
      .flat();
  }

  private printServerUrlsFor(server: http.Server | https.Server) {
    for (const url of this.getServerUrlsFor(server)) {
      this.print('info', `  ${url}`);
    }
  }

  private getServerUrlsFor(server: http.Server | https.Server): string[] {
    const urls: string[] = [];
    const { address, port } = server.address() as AddressInfo;
    const parsedIP = IpAddr.parse(address);
    const protocol = this.opts.https ? 'https' : 'http';
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
}

export default SmocksServer;

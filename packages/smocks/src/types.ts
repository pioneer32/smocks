import { ParamsDictionary, Request, RequestHandler } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

import { ICollectionMapper, IMemoryStatsStorage } from './SmocksServer.js';

export type DelayConfiguration = number | [number, number] | [undefined, number] | [number, undefined];

type Predicate = (req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>) => boolean;

export type RouteConfig = {
  id: string;
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  body?: (type: string, payload: any) => boolean;
  variants: (
    | {
        id: string;
        type: 'middleware';
        options: {
          delay?: DelayConfiguration;
          predicate?: Predicate;
          middleware: RequestHandler;
        };
      }
    | {
        id: string;
        type: 'json';
        options: {
          delay?: DelayConfiguration;
          predicate?: Predicate;
          status: number;
          body: any;
        };
      }
  )[];
};

export type SupportedTypes = Exclude<RouteConfig['variants'][number]['type'], 'middleware'>;

export type RawCollection = {
  id: string;
  from?: string;
  routes: string[];
};

export type Collection = Omit<RawCollection, 'from' | 'routes'> & { routes: Record<string, string> };

interface IHttpsServerOptions {
  ca: Buffer;
  cert: Buffer;
  key: Buffer;
}

export type SmockServerOptions = Partial<{
  port: number;
  https?: false | IHttpsServerOptions;
  cors?: boolean;
  defaultDelay?: DelayConfiguration;
  defaultCollection?: string;
  getMockSessionId: (request: Request) => Promise<string | undefined | void>;
  collectionMapper: ICollectionMapper;
  statsStorage: IMemoryStatsStorage;
  projectRoot: string;
}>;

export type SmockServerConfiguration = SmockServerOptions | (() => SmockServerOptions | Promise<SmockServerOptions>);

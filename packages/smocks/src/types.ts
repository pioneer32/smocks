import { RequestHandler } from 'express-serve-static-core';

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
          middleware: RequestHandler;
        };
      }
    | {
        id: string;
        type: 'json';
        options: {
          status: number;
          body: any;
        };
      }
  )[];
};

export type RawCollection = {
  id: string;
  from?: string;
  routes: string[];
};

export type Collection = Omit<RawCollection, 'from' | 'routes'> & { routes: Record<string, string> };

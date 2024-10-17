import * as core from 'express-serve-static-core';
import express, { Router } from 'express';
import BodyParser from 'body-parser';
import { getCurrentInvoke } from '@vendia/serverless-express';
import _ from 'lodash';
import { promises as fs } from 'node:fs';

import { sleep } from './utils.js';
import { FixtureGenerator } from './fixtureGenerator.js';
import { ICollectionMapper, IStatsStorage } from './SmocksServer.js';
import { DelayConfiguration, RouteConfig } from './types.js';
import { Request } from 'express-serve-static-core';

const isFixtureGenerator = (val: any): val is FixtureGenerator<any> => val.__nonce__ === FixtureGenerator.__nonce__; // for details about __nonce__, please see comments in FixtureGenerator

export const createMockApp = ({
  getStatsStorage,
  getFixtureFolderPath,
  getOpts,
  log,
  loadCollections,
  loadRoutes,
  getCollectionMapper,
}: {
  getCollectionMapper: () => ICollectionMapper;
  getStatsStorage: () => IStatsStorage;
  getFixtureFolderPath: () => string;
  getOpts: () => { cors?: boolean; defaultDelay: DelayConfiguration; getMockSessionId: (request: Request) => Promise<string>; defaultCollection: string };
  log: (requestId: string, message: string) => void;
  loadCollections: () => Promise<Record<string, Record<string, string>>>;
  loadRoutes: () => Promise<RouteConfig[]>;
}): core.Express => {
  const app = express();
  app.disable('etag');
  app.use(BodyParser.urlencoded({ extended: true }));
  app.use(BodyParser.json());

  app.use((req, res, next) => {
    res.on('finish', () => {
      // @ts-ignore
      const { event = {}, context = {} } = getCurrentInvoke();
      const sessionId = (req as any).mockSessionId;
      const collection = (req as any).mockCollectionName;
      const route = (req as any).mockRouteName;

      if (sessionId) {
        getStatsStorage().appendCollection(
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

      log(
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

  if (getOpts().cors || getOpts().cors === undefined) {
    app.use((req, res, next) => {
      if (req.method.toUpperCase() === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,HEAD,GET,POST,PUT,PATCH,DELETE');
        sleep(getOpts().defaultDelay).then(() => {
          res.send();
        });
        return;
      }
      next();
    });
  }

  app.all('*', async (req, res, next) => {
    // @ts-ignore
    const { event = {}, context = {} } = getCurrentInvoke();
    const router = express.Router() as Router;

    const mockSessionId = await getOpts().getMockSessionId(req);
    (req as any).mockSessionId = mockSessionId;
    const collectionName = (await getCollectionMapper().getCollectionName(mockSessionId)) || getOpts().defaultCollection;

    (req as any).mockCollectionName = collectionName;
    const collections = await loadCollections();
    const routes = await loadRoutes();

    if (!collections[collectionName]) {
      throw new Error(`No collection found for "${collectionName}"`);
    }

    const overrides = await getCollectionMapper().getOverrides?.(mockSessionId);

    Object.entries(collections[collectionName])
      .map(([name, variantName]) => [name, overrides?.[name] || variantName])
      .forEach(([name, variantName]) => {
        routes
          .filter(({ id, variants }) => id === name && variants.find(({ id }) => id === variantName))
          .forEach((route) => {
            router[route.method.toLowerCase() as 'get' | 'post' | 'put'](route.url, async (req, res) => {
              (req as any).mockRouteName = `${name}:${variantName}`;
              // @ts-ignore
              const { event = {}, context = {} } = getCurrentInvoke();

              if (getOpts().cors || getOpts().cors === undefined) {
                res.setHeader('Access-Control-Allow-Headers', '*');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,HEAD,GET,POST,PUT,PATCH,DELETE');
              }
              const variant = _.sample(
                route.variants.filter(({ id }) => id === variantName).filter(({ options: { predicate } }) => (predicate ? predicate(req) : true))
              );
              if (!variant) {
                res.statusCode = 404;
                await sleep(getOpts().defaultDelay);
                res.send();
                return;
              }
              if (route.body) {
                route.body;
              }
              if (variant.type === 'middleware') {
                (req as any).mockType = 'middleware';
                await sleep(variant.options.delay || getOpts().defaultDelay);
                await variant.options.middleware(req, res, () => {});
                return;
              }
              if (variant.type === 'file') {
                (req as any).mockType = 'middleware';
                await sleep(variant.options.delay || getOpts().defaultDelay);
                res.statusCode = variant.options.status;
                res.setHeader('Content-Type', variant.options.contentType);
                if (variant.options.body) {
                  res.send(typeof variant.options.body === 'string' ? Buffer.from(variant.options.body) : variant.options.body);
                } else {
                  const body = (await fs.readFile(variant.options.file!)).toString();
                  res.send(body);
                }
                return;
              }
              // type === json
              await sleep(variant.options.delay || getOpts().defaultDelay);
              res.statusCode = variant.options.status;
              res.setHeader('Content-Type', 'application/json;charset=UTF-8');
              if (isFixtureGenerator(variant.options.body)) {
                (req as any).mockType = `fixture/${variant.options.body.name}`;
                const dirname = getFixtureFolderPath();
                await variant.options.body.load({ dirname, type: 'json', sessionId: (req as any).mockSessionId });
                await variant.options.body.save({ dirname, type: 'json', sessionId: (req as any).mockSessionId });
                res.send(JSON.stringify(variant.options.body.get()));
              } else {
                (req as any).mockType = 'static';
                res.send(JSON.stringify(variant.options.body));
              }
              return;
            });
          });
      });
    router(req, res, next);
  });
  return app;
};

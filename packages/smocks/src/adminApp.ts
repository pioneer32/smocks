import * as core from 'express-serve-static-core';
import express from 'express';

import { ICollectionMapper, IStatsStorage } from './SmocksServer.js';

export const createAdminApp = ({
  getCollectionMapper,
  getStatsStorage,
  log,
}: {
  log: (name: string, message: string) => void;
  getCollectionMapper: () => ICollectionMapper;
  getStatsStorage: () => IStatsStorage;
}): core.Express => {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    res.on('finish', () => {
      const adminAction = (req as any).mockAdminAction;
      log('ADMIN', `"${req.method.toUpperCase()} ${decodeURI(req.url)}" ${res.statusCode} ${res.statusMessage} -> ${adminAction}`);
    });
    next();
  });

  app.put('/session/:sessionId/:route', (req, res, _next) => {
    const { variant } = req.body;
    const { sessionId, route } = req.params;
    (req as any).mockAdminAction = `Set sessionId="${sessionId}" to use "${route}:${variant}"`;
    const collectionMapper = getCollectionMapper();
    if (!collectionMapper.setOverrides || !collectionMapper.getOverrides) {
      res.statusCode = 500;
      res.send(
        'To support request level overrides. SmocksServer needs to be provided with a collectionMapper implementing both setOverrides and getOverrides methods. Please check your configuration and options passed into SmocksServer.'
      );
      return;
    }
    collectionMapper.setOverrides(sessionId, { [route]: variant }).then(() => {
      res.statusCode = 200;
      res.send();
    });
  });

  app.put('/session/:sessionId', (req, res, _next) => {
    const { collection } = req.body;
    const { sessionId } = req.params;
    (req as any).mockAdminAction = `Set sessionId="${sessionId}" to use collection="${collection}"`;
    getCollectionMapper()
      .setCollectionName(sessionId, collection)
      .then(() => {
        res.statusCode = 200;
        res.send();
      });
  });

  app.get('/session/:sessionId', (req, res, _next) => {
    const { sessionId } = req.params;
    (req as any).mockAdminAction = `Sent details of sessionId="${sessionId}"`;

    Promise.all([getCollectionMapper().getCollectionName(sessionId), getStatsStorage().getCollection(`${sessionId}:requests`)]).then(
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
    getStatsStorage()
      .removeCollection(`${sessionId}:requests`)
      .then(() => {
        res.statusCode = 200;
        res.send();
      });
  });

  app.delete('/session/:sessionId/:route/variant', (req, res, _next) => {
    const { sessionId, route } = req.params;
    (req as any).mockAdminAction = `Cleaned the request log for sessionId="${sessionId}"`;
    const collectionMapper = getCollectionMapper();
    if (!collectionMapper.setOverrides || !collectionMapper.getOverrides) {
      res.statusCode = 500;
      res.send(
        'To support request level overrides. SmocksServer needs to be provided with a collectionMapper implementing both setOverrides and getOverrides methods. Please check your configuration and options passed into SmocksServer.'
      );
      return;
    }

    collectionMapper.setOverrides(sessionId, { [route]: undefined }).then(() => {
      res.statusCode = 200;
      res.send();
    });
  });

  return app;
};

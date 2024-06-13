import { RouteConfig } from '@pioneer32/smocks';

const routes: RouteConfig[] = [
  {
    id: 'POST_USER',
    url: '/user',
    method: 'POST',
    variants: [
      {
        id: 'success',
        type: 'middleware',
        options: {
          predicate: (req) => req.body.test === '234',
          async middleware(req, res, _next) {
            res.status(200);
            res.send(`Received test=${req.body.test}`);
          },
        },
      },
      {
        id: 'success',
        type: 'json',
        options: {
          status: 200,
          predicate: (req) => req.body.test === '123',
          body: {
            id: 123,
            email: 'example@test.123',
          },
        },
      },
    ],
  },
];

export default routes;

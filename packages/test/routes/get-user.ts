import { RouteConfig } from '@pioneer32/smocks';

const routes: RouteConfig[] = [
  {
    id: 'GET_USER',
    url: '/user',
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
      {
        id: 'no-user',
        type: 'json',
        options: {
          status: 404,
          body: {
            statusCode: 404,
            message: 'No user found',
          },
        },
      },
    ],
  },
];

export default routes;

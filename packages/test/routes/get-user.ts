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
    ],
  },
];

export default routes;

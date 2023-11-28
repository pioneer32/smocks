import { fixtureGenerator, RouteConfig } from '@pioneer32/smocks';

const routes: RouteConfig[] = [
  {
    id: 'GET_USERS',
    url: '/users',
    method: 'GET',
    variants: [
      {
        id: 'success',
        type: 'json',
        options: {
          status: 200,
          body: fixtureGenerator({
            name: 'users',
            generate: () => {
              return [
                {
                  id: 1,
                  name: 'foo',
                  email: 'foo@example.com',
                },
                {
                  id: 2,
                  name: 'bar',
                  email: 'bar@example.com',
                },
                {
                  id: 3,
                  name: 'baz',
                  email: 'baz@example.com',
                },
              ];
            },
          }),
        },
      },
    ],
  },
];

export default routes;

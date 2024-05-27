import { fixtureGenerator, RouteConfig } from '@pioneer32/smocks';

const routes: RouteConfig[] = [
  {
    id: 'DOWNLOAD_USERS',
    url: '/users/download',
    method: 'GET',
    variants: [
      {
        id: 'success',
        type: 'file',
        options: {
          status: 200,
          contentType: 'text/csv',
          body: [[1, 2, 3, 4, 5, 6].join(), [11, 12, 13, 14, 15, 16].join()].join('\n'),
        },
      },
    ],
  },
];

export default routes;

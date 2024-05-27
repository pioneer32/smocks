import { RouteConfig } from '@pioneer32/smocks';

const routes: RouteConfig[] = [
  {
    id: 'DOWNLOAD_USER',
    url: '/user/download',
    method: 'GET',
    variants: [
      {
        id: 'success',
        type: 'file',
        options: {
          status: 200,
          predicate: () => true,
          contentType: 'text/html',
          file: __dirname + '/example.html',
        },
      },
    ],
  },
];

export default routes;

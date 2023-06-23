import { RouteConfig } from '@pioneer32/smocks';

const routes: RouteConfig[] = [
  {
    id: 'LOGIN_PAGE',
    url: '/login',
    method: 'GET',
    variants: [
      {
        id: 'success',
        type: 'middleware',
        options: {
          async middleware(_req, res, next) {
            res.status(200);
            res.send(`<!DOCTYPE html>
<html>
    <head>
        <title>Pseudo IAM login page</title>
    </head>
    <body>
        <h1>Welcome to Pseudo login page</h1>
        <a href="/?state=fooBar&code=cb485bf">click here to log in</a>
    </body>
</html>
`);
            next();
          },
        },
      },
    ],
  },
  {
    id: 'LOGIN_PAGE_POST',
    url: '/login',
    method: 'POST',
    variants: [
      {
        id: 'success',
        type: 'middleware',
        options: {
          async middleware(req, res, next) {
            console.log(req.body)
            res.status(200);
            res.send(`<!DOCTYPE html>
<html>
    <head>
        <title>Pseudo IAM login page</title>
    </head>
    <body>
        <h1>Welcome to Pseudo login page</h1>
        <a href="/?state=fooBar&code=cb485bf">click here to log in</a>
    </body>
</html>
`);
            next();
          },
        },
      },
    ],
  },
];

export default routes;

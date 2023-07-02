import SmocksServer from '@pioneer32/smocks';
import fetch, { RequestInit } from 'node-fetch';
import MockDate from 'mockdate';

const server = new SmocksServer({ projectRoot: __dirname });

describe('Programmatic API', () => {
  beforeAll(async () => {
    MockDate.set(1676886788388);
    await server.start();
  });

  const setCollection = async (sessionId: string, collection: string) => {
    // @ts-ignore
    await fetch('http://localhost:3001/session/' + sessionId, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ collection }),
    });
  };

  const getSessionDetails = async (sessionId: string) => {
    return await request('http://localhost:3001/session/' + sessionId);
  };

  const request = async (url: string, init?: RequestInit) => {
    // @ts-ignore
    const res = await fetch(url, init);

    return {
      status: res.status,
      contentType: res.headers.get('content-type'),
      text: await res.text(),
    };
  };

  it('listens', async () => {
    expect(server.getMockServerURLs()).toMatchInlineSnapshot(`
      [
        "http://localhost:3000/",
        "http://192.168.1.6:3000/",
        "http://fe80::1:3000/",
      ]
    `);
    expect(server.getAdminServerURLs()).toMatchInlineSnapshot(`
      [
        "http://localhost:3001/",
        "http://192.168.1.6:3001/",
        "http://fe80::1:3001/",
      ]
    `);
  });

  it('works', async () => {
    expect(await getSessionDetails('default')).toMatchInlineSnapshot(`
      {
        "contentType": "application/json; charset=utf-8",
        "status": 200,
        "text": "{"requests":[]}",
      }
    `);

    await setCollection('default', 'unauthenticated');

    expect(await getSessionDetails('default')).toMatchInlineSnapshot(`
      {
        "contentType": "application/json; charset=utf-8",
        "status": 200,
        "text": "{"collectionName":"unauthenticated","requests":[]}",
      }
    `);

    // open login page => HTTP 200
    expect(await request('http://localhost:3000/login')).toMatchInlineSnapshot(`
      {
        "contentType": "text/html; charset=utf-8",
        "status": 200,
        "text": "<!DOCTYPE html>
      <html>
          <head>
              <title>Pseudo IAM login page</title>
          </head>
          <body>
              <h1>Welcome to Pseudo login page</h1>
              <a href="/?state=fooBar&code=cb485bf">click here to log in</a>
          </body>
      </html>
      ",
      }
    `);

    expect(await getSessionDetails('default')).toMatchInlineSnapshot(`
      {
        "contentType": "application/json; charset=utf-8",
        "status": 200,
        "text": "{"collectionName":"unauthenticated","requests":[{"timestamp":1676886788388,"collection":"unauthenticated","route":"LOGIN_PAGE:success","request":{"method":"GET","url":"/login"},"response":{"statusCode":200}}]}",
      }
    `);

    // then try to get the user being unauthenticated => HTTP 401
    expect(await request('http://localhost:3000/user')).toMatchInlineSnapshot(`
      {
        "contentType": "application/json; charset=utf-8",
        "status": 401,
        "text": "{}",
      }
    `);

    expect(await getSessionDetails('default')).toMatchInlineSnapshot(`
      {
        "contentType": "application/json; charset=utf-8",
        "status": 200,
        "text": "{"collectionName":"unauthenticated","requests":[{"timestamp":1676886788388,"collection":"unauthenticated","route":"LOGIN_PAGE:success","request":{"method":"GET","url":"/login"},"response":{"statusCode":200}},{"timestamp":1676886788388,"collection":"unauthenticated","route":"GET_USER:unauthenticated","request":{"method":"GET","url":"/user"},"response":{"statusCode":401}}]}",
      }
    `);

    await setCollection('default', 'base');

    expect(await getSessionDetails('default')).toMatchInlineSnapshot(`
      {
        "contentType": "application/json; charset=utf-8",
        "status": 200,
        "text": "{"collectionName":"base","requests":[{"timestamp":1676886788388,"collection":"unauthenticated","route":"LOGIN_PAGE:success","request":{"method":"GET","url":"/login"},"response":{"statusCode":200}},{"timestamp":1676886788388,"collection":"unauthenticated","route":"GET_USER:unauthenticated","request":{"method":"GET","url":"/user"},"response":{"statusCode":401}}]}",
      }
    `);

    // open login page again => HTTP 200
    expect(await request('http://localhost:3000/login')).toMatchInlineSnapshot(`
      {
        "contentType": "text/html; charset=utf-8",
        "status": 200,
        "text": "<!DOCTYPE html>
      <html>
          <head>
              <title>Pseudo IAM login page</title>
          </head>
          <body>
              <h1>Welcome to Pseudo login page</h1>
              <a href="/?state=fooBar&code=cb485bf">click here to log in</a>
          </body>
      </html>
      ",
      }
    `);

    expect(await getSessionDetails('default')).toMatchInlineSnapshot(`
      {
        "contentType": "application/json; charset=utf-8",
        "status": 200,
        "text": "{"collectionName":"base","requests":[{"timestamp":1676886788388,"collection":"unauthenticated","route":"LOGIN_PAGE:success","request":{"method":"GET","url":"/login"},"response":{"statusCode":200}},{"timestamp":1676886788388,"collection":"unauthenticated","route":"GET_USER:unauthenticated","request":{"method":"GET","url":"/user"},"response":{"statusCode":401}},{"timestamp":1676886788388,"collection":"base","route":"LOGIN_PAGE:success","request":{"method":"GET","url":"/login"},"response":{"statusCode":200}}]}",
      }
    `);

    // log in => HTTP 200
    expect(
      await request('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'foo@bar.baz', password: 'foo' }),
      })
    ).toMatchInlineSnapshot(`
      {
        "contentType": "application/json; charset=utf-8",
        "status": 200,
        "text": "{"accessToken":"foo"}",
      }
    `);

    expect(await getSessionDetails('default')).toMatchInlineSnapshot(`
      {
        "contentType": "application/json; charset=utf-8",
        "status": 200,
        "text": "{"collectionName":"base","requests":[{"timestamp":1676886788388,"collection":"unauthenticated","route":"LOGIN_PAGE:success","request":{"method":"GET","url":"/login"},"response":{"statusCode":200}},{"timestamp":1676886788388,"collection":"unauthenticated","route":"GET_USER:unauthenticated","request":{"method":"GET","url":"/user"},"response":{"statusCode":401}},{"timestamp":1676886788388,"collection":"base","route":"LOGIN_PAGE:success","request":{"method":"GET","url":"/login"},"response":{"statusCode":200}},{"timestamp":1676886788388,"collection":"base","route":"LOGIN_PAGE_POST:success","request":{"method":"POST","url":"/login"},"response":{"statusCode":200}}]}",
      }
    `);

    // let's clean session requests:
    // @ts-ignore
    await fetch(`http://localhost:3001/session/default/requests`, {
      method: 'DELETE',
    });

    expect(await getSessionDetails('default')).toMatchInlineSnapshot(`
      {
        "contentType": "application/json; charset=utf-8",
        "status": 200,
        "text": "{"collectionName":"base","requests":[]}",
      }
    `);

    // then get the user being unauthenticated => HTTP 200
    expect(await request('http://localhost:3000/user')).toMatchInlineSnapshot(`
      {
        "contentType": "application/json; charset=utf-8",
        "status": 200,
        "text": "{"id":1,"email":"foo@bar.baz"}",
      }
    `);

    expect(await getSessionDetails('default')).toMatchInlineSnapshot(`
      {
        "contentType": "application/json; charset=utf-8",
        "status": 200,
        "text": "{"collectionName":"base","requests":[{"timestamp":1676886788388,"collection":"base","route":"GET_USER:success","request":{"method":"GET","url":"/user"},"response":{"statusCode":200}}]}",
      }
    `);
  });

  afterAll(async () => {
    await server.stop();
    MockDate.reset();
  });
});

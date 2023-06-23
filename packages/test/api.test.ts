import SmocksServer from '@pioneer32/smocks';
import fetch, { RequestInit } from 'node-fetch';

const server = new SmocksServer();

describe('Programmatic API', () => {
  beforeAll(async () => {
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

  const request = async (url: string, init?: RequestInit) => {
    // @ts-ignore
    const res = await fetch(url, init);

    return {
      status: res.status,
      text: await res.text(),
    };
  };

  it('works', async () => {
    await setCollection('default', 'unauthenticated');

    // try to log in
    expect(await request('http://localhost:3000/login')).toMatchInlineSnapshot(`
      {
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
    // try to get the user being unauthenticated
    expect(await request('http://localhost:3000/user')).toMatchInlineSnapshot(`
      {
        "status": 401,
        "text": "{}",
      }
    `);

    await setCollection('default', 'base');

    // try to log in
    expect(await request('http://localhost:3000/login')).toMatchInlineSnapshot(`
      {
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
    expect(
      await request('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'foo@bar.baz', password: 'foo' }),
      })
    ).toMatchInlineSnapshot(`
      {
        "status": 404,
        "text": "<!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="utf-8">
      <title>Error</title>
      </head>
      <body>
      <pre>Cannot POST /login</pre>
      </body>
      </html>
      ",
      }
    `);
    expect(await request('http://localhost:3000/user')).toMatchInlineSnapshot(`
      {
        "status": 200,
        "text": "{"id":1,"email":"foo@bar.baz"}",
      }
    `);
  });

  afterAll(async () => {
    await server.stop();
  });
});

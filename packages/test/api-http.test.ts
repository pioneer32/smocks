import SmocksServer from '@pioneer32/smocks';
import fetch, { RequestInit } from 'node-fetch';
import MockDate from 'mockdate';
import fs from 'node:fs';

let server: SmocksServer;

jest.setTimeout(15_000);

describe('Programmatic API', () => {
  beforeAll(async () => {
    MockDate.set(1676886788388);
    server = new SmocksServer({ projectRoot: __dirname });
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
      headers: [...res.headers.entries()].filter(([name]) => name !== 'date').map(([name, value]) => `${name}: ${value}`),
      text: await res.text(),
    };
  };

  const clearSessionRequests = async (sessionId: string) => {
    // @ts-ignore
    await fetch(`http://localhost:3001/session/${sessionId}/requests`, { method: 'DELETE' });
  };

  it('listens', async () => {
    expect(server.getMockServerURLs()).toMatchSnapshot('getMockServerURLs');
    expect(server.getAdminServerURLs()).toMatchSnapshot('getAdminServerURLs');
  });

  it('handles OPTIONS request by default', async () => {
    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');
    // preflight OPTIONS to check CORS
    expect(await request('http://localhost:3000/login', { method: 'OPTIONS' })).toMatchSnapshot('response');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // let's clean session requests:
    await clearSessionRequests('default');
  });

  it('works', async () => {
    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    await setCollection('default', 'unauthenticated');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // open login page => HTTP 200
    expect(await request('http://localhost:3000/login')).toMatchSnapshot('response');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // then try to get the user being unauthenticated => HTTP 401
    expect(await request('http://localhost:3000/user')).toMatchSnapshot('response');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    await setCollection('default', 'base');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // open login page again => HTTP 200
    expect(await request('http://localhost:3000/login')).toMatchSnapshot('response');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // log in => HTTP 200
    expect(
      await request('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'foo@bar.baz', password: 'foo' }),
      })
    ).toMatchSnapshot('response');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // let's clean session requests:
    await clearSessionRequests('default');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // then get the user being unauthenticated => HTTP 200
    expect(await request('http://localhost:3000/user')).toMatchSnapshot('response');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // let's clean session requests:
    await clearSessionRequests('default');
  });

  it('sends files', async () => {
    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // download file provided as a file => HTTP 200
    expect(
      await request('http://localhost:3000/user/download', {
        method: 'GET',
      })
    ).toMatchSnapshot('response');

    // download file provided as a string=> HTTP 200
    expect(
      await request('http://localhost:3000/users/download', {
        method: 'GET',
      })
    ).toMatchSnapshot('response');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // let's clean session requests:
    await clearSessionRequests('default');
  });

  it('sends CORS headers by default', async () => {
    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    await setCollection('default', 'base');

    // get the user => HTTP 200
    expect(await request('http://localhost:3000/user')).toMatchSnapshot('response');

    await setCollection('default', 'no-user');

    // get the user => HTTP 404
    expect(await request('http://localhost:3000/user')).toMatchSnapshot('response');
  });

  it('persists fixtures when none is found', async () => {
    const filename = __dirname + '/__fixtures__/users.fixtureshot.json';
    try {
      fs.unlinkSync(filename);
    } catch (e) {}
    expect(await request('http://localhost:3000/users')).toMatchSnapshot('response');
    // fs.accessSync(filename, fsConstants.R_OK);
    expect(fs.readFileSync(filename).toString()).toMatchSnapshot('fixture');
  });

  it('returns all values from the fixtures when found and match', async () => {
    const filename = __dirname + '/__fixtures__/users.fixtureshot.json';
    fs.writeFileSync(
      filename,
      JSON.stringify(
        [
          {
            id: 11,
            name: 'A',
            email: 'foo@example.com',
          },
          {
            id: 12,
            name: 'B',
            email: 'bar@example.com',
          },
          {
            id: 13,
            name: 'C',
            email: 'baz@example.com',
          },
        ],
        null,
        2
      )
    );
    expect(await request('http://localhost:3000/users')).toMatchSnapshot('response');
    expect(fs.readFileSync(filename).toString()).toMatchSnapshot('fixture');
  });

  it('returns all values from the fixtures when found, but updates when generated structure changes', async () => {
    const filename = __dirname + '/__fixtures__/users.fixtureshot.json';
    fs.writeFileSync(
      filename,
      JSON.stringify(
        [
          {
            id: 21,
          },
          {
            id: 22,
          },
          {
            id: 23,
          },
        ],
        null,
        2
      )
    );
    expect(await request('http://localhost:3000/users')).toMatchSnapshot('response');
    expect(fs.readFileSync(filename).toString()).toMatchSnapshot('fixture');
  });

  afterAll(async () => {
    await server.stop();
    MockDate.reset();
  });
});

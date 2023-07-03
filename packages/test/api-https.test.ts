import SmocksServer from '@pioneer32/smocks';
import fetch, { RequestInit } from 'node-fetch';
import MockDate from 'mockdate';
import { getHttpsServerOptions } from 'office-addin-dev-certs';

import https from 'node:https';

const agent = new https.Agent({ rejectUnauthorized: false });

let server: SmocksServer;

describe('Programmatic API', () => {
  beforeAll(async () => {
    MockDate.set(1676886788388);
    server = new SmocksServer({ projectRoot: __dirname, https: await getHttpsServerOptions() });
    await server.start();
  });

  const setCollection = async (sessionId: string, collection: string) => {
    // @ts-ignore
    await fetch('https://localhost:3001/session/' + sessionId, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ collection }),
      agent,
    });
  };

  const getSessionDetails = async (sessionId: string) => {
    return await request('https://localhost:3001/session/' + sessionId);
  };

  const request = async (url: string, init?: RequestInit) => {
    // @ts-ignore
    const res = await fetch(url, { ...init, agent });

    return {
      status: res.status,
      headers: [...res.headers.entries()].filter(([name]) => name !== 'date').map(([name, value]) => `${name}: ${value}`),
      text: await res.text(),
    };
  };

  it('listens', async () => {
    expect(server.getMockServerURLs()).toMatchSnapshot('getMockServerURLs');
    expect(server.getAdminServerURLs()).toMatchSnapshot('getAdminServerURLs');
  });

  it('works', async () => {
    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    await setCollection('default', 'unauthenticated');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // open login page => HTTP 200
    expect(await request('https://localhost:3000/login')).toMatchSnapshot('response');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // then try to get the user being unauthenticated => HTTP 401
    expect(await request('https://localhost:3000/user')).toMatchSnapshot('response');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    await setCollection('default', 'base');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // open login page again => HTTP 200
    expect(await request('https://localhost:3000/login')).toMatchSnapshot('response');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // log in => HTTP 200
    expect(
      await request('https://localhost:3000/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'foo@bar.baz', password: 'foo' }),
      })
    ).toMatchSnapshot('response');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // let's clean session requests:
    // @ts-ignore
    await fetch(`https://localhost:3001/session/default/requests`, {
      method: 'DELETE',
      agent,
    });

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // then get the user being unauthenticated => HTTP 200
    expect(await request('https://localhost:3000/user')).toMatchSnapshot('response');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');
  });

  afterAll(async () => {
    await server.stop();
    MockDate.reset();
  });
});

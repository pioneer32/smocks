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
    expect(server.getMockServerURLs()).toMatchSnapshot('getMockServerURLs');
    expect(server.getAdminServerURLs()).toMatchSnapshot('getAdminServerURLs');
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
    // @ts-ignore
    await fetch(`http://localhost:3001/session/default/requests`, {
      method: 'DELETE',
    });

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');

    // then get the user being unauthenticated => HTTP 200
    expect(await request('http://localhost:3000/user')).toMatchSnapshot('response');

    expect(await getSessionDetails('default')).toMatchSnapshot('session-details');
  });

  afterAll(async () => {
    await server.stop();
    MockDate.reset();
  });
});

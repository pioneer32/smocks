import fetch, { RequestInit } from 'node-fetch';
import path from 'node:path';
import { ChildProcessByStdio, spawn } from 'node:child_process';

import https from 'node:https';

const compiledCliScriptPath = path.resolve(__dirname, '../smocks/dist/cli.cjs');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const request = async (url: string, init?: RequestInit) => {
  // @ts-ignore
  const res = await fetch(url, init);

  return {
    status: res.status,
    headers: [...res.headers.entries()].filter(([name]) => name !== 'date' && name !== 'etag').map(([name, value]) => `${name}: ${value}`),
    text: await res.text(),
  };
};

describe('CLI', () => {
  describe('static config', () => {
    const configFile = path.resolve(__dirname, 'config.static.cjs');
    let childProcess: ChildProcessByStdio<null, null, null>;
    beforeAll(async () => {
      console.log('Starting Smocks CLI as a child process...')
      childProcess = spawn('node', [compiledCliScriptPath, 'start', '-c', configFile], {
        stdio: ['inherit', 'inherit', 'inherit'],
      });
      await sleep(2000);
    });
    afterAll(async () => {
      childProcess.kill('SIGHUP');
    });

    it('works', async () => {
      expect(await await request('http://localhost:3001/session/default')).toMatchSnapshot('session-details');
      expect(await request('http://localhost:3000/login')).toMatchSnapshot('response');
    });
  });

  describe('dynamic config', () => {
    const configFile = path.resolve(__dirname, 'config.dynamic.cjs');
    const agent = new https.Agent({ rejectUnauthorized: false });
    let childProcess: ChildProcessByStdio<null, null, null>;
    beforeAll(async () => {
      childProcess = spawn('node', [compiledCliScriptPath, 'start', '-c', configFile], {
        stdio: ['inherit', 'inherit', 'inherit'],
      });
      await sleep(2000);
    });
    afterAll(async () => {
      childProcess.kill('SIGHUP');
    });

    it('works', async () => {
      expect(await await request('https://localhost:3001/session/default', { agent })).toMatchSnapshot('session-details');
      expect(await request('https://localhost:3000/login', { agent })).toMatchSnapshot('response');
    });
  });
});

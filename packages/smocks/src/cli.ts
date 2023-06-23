#!/usr/bin/env node

import { Command } from 'commander';
import SmocksServer from './SmocksServer';

const program = new Command();

program
  .name('smocks')
  .command('start')
  .description('Start Smocks Server')
  .option('-p, --port <port>', 'port to listen to for main requests', '3000')
  .option('-ap, --admin-port <port>', 'port to listen to for admin requests', '3001')
  .action((opts, _cmd) => {
    const server = new SmocksServer({ port: +opts.port });
    server.start();
  });

program.parse();

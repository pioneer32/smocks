#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('smocks')
  .command('start')
  .description('Start Smocks Server')
  .option('-p, --port <port>', 'port to listen to for main requests', '3000')
  .option('-ap, --admin-port <port>', 'port to listen to for admin requests', '3001')
  .action((opts, cmd) => {
    console.log('hi', { opts, cmd });
  });

program.parse();

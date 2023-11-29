#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')));

delete packageJson.exports['.'].default;
packageJson.type = 'commonjs';

fs.writeFileSync(path.join(__dirname, '..', 'package.json'), JSON.stringify(packageJson, null, 4));

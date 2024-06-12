import fsSync, { constants, promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import { DelayConfiguration } from './types.js';

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath, constants.R_OK);
    return true;
  } catch (e) {
    return false;
  }
};

export const fileExistsSync = (filePath: string): boolean => {
  try {
    fsSync.accessSync(filePath, constants.R_OK);
    return true;
  } catch (e) {
    return false;
  }
};

export const dirExists = async (dirPath: string): Promise<boolean> => {
  try {
    await fs.access(dirPath, constants.R_OK | constants.X_OK);
    return true;
  } catch (e) {
    return false;
  }
};

export const dirExistsSync = (dirPath: string): boolean => {
  try {
    fsSync.accessSync(dirPath, constants.R_OK | constants.X_OK);
    return true;
  } catch (e) {
    return false;
  }
};

export const ensureDirExistsSync = (dirPath: string) => {
  try {
    fsSync.accessSync(dirPath, constants.R_OK | constants.X_OK);
    return;
  } catch (e) {
    fsSync.mkdirSync(dirPath);
  }
};

export const fileContentHash = (filePath: string): Promise<string> => {
  return new Promise((res, rej) => {
    const stream = fsSync.createReadStream(filePath);
    const hash = crypto.createHash('sha1');
    hash.setEncoding('hex');
    stream.on('end', function () {
      hash.end();
      res(hash.read());
    });
    stream.on('error', rej);
    stream.pipe(hash);
  });
};

export const sleep = async (delayConfig: DelayConfiguration) => {
  let ms: number;
  if (!delayConfig) {
    return;
  } else if (Array.isArray(delayConfig)) {
    const min = delayConfig[0] || 0;
    const max = delayConfig[1] || 15_000;
    const delta = Math.abs(max - min);
    ms = Math.random() * delta + Math.min(min, max);
  } else {
    ms = delayConfig;
  }
  return new Promise((res) => setTimeout(res, ms));
};

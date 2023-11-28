import fsSync, { constants, promises as fs } from 'node:fs';
import crypto from 'node:crypto';

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

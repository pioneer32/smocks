import * as path from 'node:path';
import tsc from 'typescript';
import { promises as fs } from 'node:fs';
import { fileContentHash, fileExists } from './utils.js';
import crypto from 'node:crypto';

const USE_ESM = typeof require === 'undefined';

const transpile = async (tsFilePath: string, outputJsFilePath: string) => {
  const tsCode = (await fs.readFile(tsFilePath)).toString();
  await fs.mkdir(path.dirname(outputJsFilePath), { recursive: true });
  // The route files often contain __dirname and __filename. Given we they are imported from the cache, those constants point to the cache path, which is not what the route developers expect
  // Let's "fix" it
  const fixedTsCode = `const __ORIG__filename = "${tsFilePath.replace(/\\/g, '\\\\')}"; const __ORIG__dirname = "${path
    .dirname(tsFilePath)
    .replace(/\\/g, '\\\\')}";\n${tsCode.replace(/__filename/g, '__ORIG__filename').replace(/__dirname/g, '__ORIG__dirname')}`;
  const jsOutput = tsc.transpileModule(fixedTsCode, {
    compilerOptions: {
      module: USE_ESM ? tsc.ModuleKind.ESNext : tsc.ModuleKind.CommonJS,
      moduleResolution: tsc.ModuleResolutionKind.Node16,
      target: tsc.ScriptTarget.ES2020,
    },
  }).outputText;
  if (!jsOutput) {
    throw new Error(`Failed to transpile "${tsFilePath}": tsc.transpileModule returned empty string `);
  }
  await fs.writeFile(outputJsFilePath, jsOutput);
};

export type Options = {
  cacheDir?: string;
};

export const load = async (tsModulePath: string, options: Options = {}) => {
  const cwd = process.cwd();
  const cacheDir: string = options.cacheDir ?? path.join(cwd, '.cache');
  const compiledJsExtension = USE_ESM ? 'mjs' : 'cjs';

  const tsPath = path.resolve(cwd, tsModulePath);
  const tsPathHash = crypto.createHash('md5').update(tsPath).digest('hex');
  const tsFileHash = await fileContentHash(tsPath);

  const outputJsFilePath = path.join(cacheDir, `${tsPathHash}_${tsFileHash}.${compiledJsExtension}`);

  if (!(await fileExists(outputJsFilePath))) {
    await transpile(tsPath, outputJsFilePath);
  }

  // @ts-ignore
  if (typeof __non_webpack_require__ !== 'undefined') {
    // cool, this is a bundled with webpack js file
    // @ts-ignore
    return __non_webpack_require__(/*webpackIgnore: true*/ outputJsFilePath);
  } else if (typeof jest !== 'undefined' && typeof jest?.requireActual !== 'undefined') {
    // cool, this is jest - for more details, see https://github.com/nodejs/node/issues/35889
    // @ts-ignore
    const loaded = jest.requireActual(outputJsFilePath);
    return loaded;
  } else {
    // @ts-ignore
    const loaded = await import(USE_ESM ? 'file://' + outputJsFilePath : outputJsFilePath);
    return loaded;
  }
};

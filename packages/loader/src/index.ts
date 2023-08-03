import * as path from 'node:path';
import tsc from 'typescript';
import { promises as fs } from 'node:fs';
import { fileContentHash, fileExists } from '@pioneer32/smocks-utils';

const transpile = async (tsFilePath: string, outputJsFilePath: string) => {
  const tsCode = (await fs.readFile(tsFilePath)).toString();
  await fs.mkdir(path.dirname(outputJsFilePath), { recursive: true });
  await fs.writeFile(
    outputJsFilePath,
    tsc.transpileModule(tsCode.toString(), {
      compilerOptions: {
        module: tsc.ModuleKind.CommonJS,
        moduleResolution: tsc.ModuleResolutionKind.Node16,
        target: tsc.ScriptTarget.ES2020,
      },
    }).outputText
  );
};

export type Options = {
  cacheDir?: string;
};

export const load = async (tsModulePath: string, options: Options = {}) => {
  const cwd = process.cwd();
  const cacheDir: string = options.cacheDir ?? path.join(cwd, '.cache');
  const compiledJsExtension = 'cjs';

  const tsPath = path.resolve(cwd, tsModulePath);
  const tsFileHash = await fileContentHash(tsPath);

  const outputJsFilePath =
    path.join(cacheDir, process.platform === `win32` ? tsPath.split(`:`)[1]! : tsPath).replace(/\.[tj]sx?$/, '') + `.${tsFileHash}.${compiledJsExtension}`;

  if (!(await fileExists(outputJsFilePath))) {
    await transpile(tsPath, outputJsFilePath);
  }

  // @ts-ignore
  if (typeof __non_webpack_require__ !== 'undefined') {
    // cool, this is a bundled with webpack js file
    // @ts-ignore
    return __non_webpack_require__(/*webpackIgnore: true*/ outputJsFilePath);
  } else if (typeof jest?.requireActual !== 'undefined') {
    // cool, this is jest - for more details, see https://github.com/nodejs/node/issues/35889
    // @ts-ignore
    const loaded = jest.requireActual(outputJsFilePath);
    return loaded;
  } else {
    // @ts-ignore
    const loaded = await import(outputJsFilePath);
    return loaded;
  }
};

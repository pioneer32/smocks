import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import { ensureDirExistsSync, fileExistsSync } from './utils.js';
import * as console from 'console';
import { SupportedTypes } from './types.js';

type PersisterCtx = { sessionId: string; dirname: string; name: string; type: SupportedTypes };

export type IFixtureGeneratorOptions<T> = {
  name: string;
  save: (this: unknown, ctx: PersisterCtx, val: T) => Promise<void>;
  load: (this: unknown, ctx: PersisterCtx) => Promise<T | undefined>;
  generate: (this: unknown) => Promise<T> | T;
};

export interface IFixtureGenerator<T> {
  load(ctx: Pick<PersisterCtx, 'dirname' | 'sessionId' | 'type'>): Promise<void>;
  save(ctx: Pick<PersisterCtx, 'dirname' | 'sessionId' | 'type'>): Promise<void>;
  get(): T;
}

const isObject = (val: any): val is Object => typeof val === 'object' && !Array.isArray(val) && val !== null;

const mergeFixtures = (saved: any, generated: any): any => {
  if (typeof saved === 'function' || typeof generated === 'function') {
    throw new Error('One of the fixtures contain a function. Only serializable data is allowed.');
  }

  if (Array.isArray(saved) && Array.isArray(generated)) {
    const res = [...saved];
    for (let i = 0; i < saved.length; i++) {
      if (isObject(saved[i]) && isObject(generated[i])) {
        res[i] = mergeFixtures(saved[i], generated[i]);
      }
    }
    return res;
  }

  if (typeof saved === 'object' && saved !== null && typeof generated === 'object' && generated !== null) {
    const keys = [...new Set([...Object.keys(generated), ...Object.keys(saved)])].sort();
    const res = {} as any;
    for (const key of keys) {
      res[key] = mergeFixtures(saved[key], generated[key]);
    }
    return res;
  }
  return saved === undefined ? generated : saved;
};

const getDefaultFixturePersister = <T extends any>(): Pick<IFixtureGeneratorOptions<T>, 'load' | 'save'> => ({
  async load({ dirname, name, type }) {
    const filename = path.resolve(dirname, `${name}.fixtureshot.${type}`);
    if (!fileExistsSync(filename)) {
      return undefined;
    }
    const content = (await fs.readFile(filename)).toString();
    switch (type) {
      case 'json':
        return JSON.parse(content);
      default:
        return content;
    }
  },
  async save({ dirname, name, type }, value) {
    ensureDirExistsSync(dirname);
    const filename = path.resolve(dirname, `${name}.fixtureshot.${type}`);
    let content: string;
    switch (type) {
      case 'json':
        content = JSON.stringify(value, null, 2);
        break;
      default:
        content = value + '';
    }
    await fs.writeFile(filename, content);
  },
});

export class FixtureGenerator<T> implements IFixtureGenerator<T> {
  // Due to the way we bundle cli.js, we can't use "instanceof FixtureGenerator". This might be fixed with changing how it's all bundled
  public static readonly __nonce__ = '7d0fefa94e3bc5438e';
  public readonly __nonce__ = FixtureGenerator.__nonce__;

  private fixture: T | undefined = undefined;
  private loaded: boolean = false;
  private opts: IFixtureGeneratorOptions<T>;
  constructor(opts: IFixtureGeneratorOptions<T>) {
    this.opts = { ...opts };
  }

  get name(): string {
    return this.opts.name;
  }

  get() {
    if (!this.loaded) {
      throw new Error('FixtureGenerator: no fixture has been loaded. Please call load() first');
    }
    return this.fixture!;
  }

  async load(ctx: Pick<PersisterCtx, 'dirname' | 'sessionId' | 'type'>) {
    const savedFixture = await this.loadOrVoid(ctx);
    const generatedFixture = await this.opts.generate();
    this.fixture = mergeFixtures(savedFixture, generatedFixture);
    this.loaded = true;
  }

  async save(ctx: Pick<PersisterCtx, 'dirname' | 'sessionId' | 'type'>) {
    if (!this.loaded) {
      throw new Error('FixtureGenerator: no fixture has been loaded. Please call load() first');
    }
    await this.opts.save({ ...ctx, name: this.opts.name }, this.fixture!);
  }

  private async loadOrVoid(ctx: Pick<PersisterCtx, 'dirname' | 'sessionId' | 'type'>) {
    try {
      return await this.opts.load({ ...ctx, name: this.opts.name });
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}

const fixtureGenerator = <T extends any>(
  opts: {
    name: string;
    generate: (this: unknown) => Promise<T> | T;
  } & (
    | {
        save: (this: unknown, ctx: PersisterCtx, val: T) => Promise<void>;
        load: (this: unknown, ctx: PersisterCtx) => Promise<T | undefined>;
      }
    | {
        save?: never;
        load?: never;
      }
  )
): IFixtureGenerator<T> => new FixtureGenerator<T>({ ...getDefaultFixturePersister<T>(), ...opts });

export default fixtureGenerator;

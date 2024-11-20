import { FixtureGenerator } from '../src/fixtureGenerator';

// by the spec, JSON.stringify replaces undefined with null, here's a work-around:
const jsonStringify = (val: any) =>
  JSON.stringify(val, (_k: any, v: any) => (typeof v === 'undefined' ? '/* undefined */' : v)).replace('"/* undefined */"', 'undefined');

describe('FixtureGenerator', () => {
  describe('Merging saved with generated', () => {
    [
      // primitives
      [undefined, 'a', 'a'],
      ['a', undefined, 'a'],
      ['a', 'b', 'a'],
      [null, 'a', null],
      ['a', null, 'a'],
      ['a', [], 'a'],
      [[], 'a', []],
      ['a', {}, 'a'],
      [{}, 'a', {}],
      [null, null, null],

      // objects
      [{}, { a: 1 }, { a: 1 }],
      [{ a: 1 }, { a: undefined }, { a: 1 }],
      [{ a: 1 }, {}, { a: 1 }],
      [{ a: 1 }, { a: 2 }, { a: 1 }],
      [{ a: null }, { a: 1 }, { a: null }],
      [{ a: 1 }, { a: null }, { a: 1 }],
      [{ a: 1 }, { a: [] }, { a: 1 }],
      [{ a: [] }, { a: 1 }, { a: [] }],
      [{ a: 1 }, { a: {} }, { a: 1 }],
      [{ a: {} }, { a: 1 }, { a: {} }],
      [{ a: 1 }, { b: 2 }, { a: 1, b: 2 }],
      [{ a: 1 }, { a: 2, b: 3 }, { a: 1, b: 3 }],
      [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
        { a: 1, b: 2 },
      ],
      [
        { a: 1, b: null },
        { a: 3, b: 4 },
        { a: 1, b: null },
      ],
      [
        { a: 1, b: 2 },
        { a: 3, b: null },
        { a: 1, b: 2 },
      ],

      // arrays
      [[], ['a'], []],
      [
        [undefined, 'b'],
        ['a', 'b'],
        [undefined, 'b'],
      ],
      [
        [undefined, 'b'],
        [undefined, 'a'],
        [undefined, 'b'],
      ],
      [
        ['', 'b'],
        ['a', 'b'],
        ['', 'b'],
      ],
      [
        [null, 'b'],
        ['a', 'b'],
        [null, 'b'],
      ],
      [['a'], [], ['a']],
      [['a', 'b'], ['b'], ['a', 'b']],

      [[{ a: 1 }, { b: 1 }], [{ a: 2, b: 3 }], [{ a: 1, b: 3 }, { b: 1 }]],
      [[null, { b: 1 }], [{ a: 2, b: 3 }], [null, { b: 1 }]],
      [
        [null, { b: 1 }],
        [undefined, { a: 2, b: 3 }],
        [null, { a: 2, b: 1 }],
      ],
    ].forEach(([saved, generated, expected]) => {
      it(`Given: ${jsonStringify(saved)} is loaded. When ${jsonStringify(generated)} is generated. Then it results in ${jsonStringify(expected)}`, async () => {
        const save = jest.fn();
        const load = jest.fn();
        load.mockResolvedValueOnce(saved);
        const subject = new FixtureGenerator({
          name: 'test',
          save,
          load,
          generate: () => generated,
        });
        await subject.load({} as any);
        expect(JSON.stringify(subject.get())).toBe(JSON.stringify(expected));
      });
    });
  });
});

import { FixtureGenerator } from '../src/fixtureGenerator';

describe('FixtureGenerator', () => {
  describe('Merging saved with generated', () => {
    [
      [undefined, 'a', 'a'],
      ['a', undefined, 'a'],
      ['a', 'b', 'a'],
      [null, 'a', null],
      ['a', null, 'a'],
      ['a', [], 'a'],
      [[], 'a', []],
      ['a', {}, 'a'],
      [{}, 'a', {}],

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

      [[], ['a'], ['a']],
      [
        [undefined, 'b'],
        ['a', 'b'],
        ['a', 'b'],
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

      [{}, { a: 1 }, { a: 1 }],
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
    ].forEach(([saved, generated, expected]) => {
      it(`Given: ${JSON.stringify(saved)} is loaded. When ${JSON.stringify(generated)} is generated. Then it results in ${JSON.stringify(
        expected
      )}`, async () => {
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

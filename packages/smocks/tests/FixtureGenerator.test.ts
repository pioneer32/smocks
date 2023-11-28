import { FixtureGenerator } from '../src/fixtureGenerator';

describe('FixtureGenerator', () => {
  describe('Merging saved with generated', () => {
    it.each([
      [
        undefined,
        [
          { a: 1, b: 'one' },
          { a: 2, b: 'two' },
        ],
        [
          { a: 1, b: 'one' },
          { a: 2, b: 'two' },
        ],
      ],

      [
        [{ a: 1, b: 'one' }],
        [
          { a: 1, b: '1' },
          { a: 2, b: '2' },
        ],
        [
          { a: 1, b: 'one' },
          { a: 2, b: '2' },
        ],
      ],

      [
        [
          { a: 1, b: '1' },
          { a: 2, b: '2' },
        ],
        [{ a: 1, b: 'one' }],
        [{ a: 1, b: '1' }],
      ],

      [
        [{ b: '1' }, { a: 2 }],
        [
          { a: 1, b: 'one' },
          { a: 2, b: 'two' },
        ],
        [
          { a: 1, b: '1' },
          { a: 2, b: 'two' },
        ],
      ],

      [
        { a: 1, b: 'one' },
        { a: 2, b: 'two' },
        { a: 1, b: 'one' },
      ],

      [
        { a: 1 },
        { a: 2, b: 'two' },
        { a: 1, b: 'two' },
      ],
    ])('replaces values with generated ones when position matches', async (saved, generated, expected) => {
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

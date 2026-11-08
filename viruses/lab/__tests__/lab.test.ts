import { describe, it, expect } from 'vitest';
import { mixSources } from '../lab';

const viruses = ['sphere', 'cubes'];

describe('mixSources', () => {
  it('builds iframe srcs for registered viruses', () => {
    const params = new URLSearchParams('primary=sphere&secondary=cubes');
    expect(mixSources(params, viruses)).toEqual([
      '/viruses/sphere/',
      '/viruses/cubes/',
    ]);
  });

  it.each([
    'primary=..%2F..%2Ffoo&secondary=cubes',
    'primary=sphere&secondary=..%2F..%2Ffoo',
    'primary=sphere',
  ])('rejects %s', query => {
    expect(mixSources(new URLSearchParams(query), viruses)).toBeNull();
  });
});

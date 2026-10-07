import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normaliseContent } from './content.ts';

describe('normaliseContent', () => {
  it('accepts each single type', () => {
    assert.deepEqual(normaliseContent('skills'), ['skills']);
    assert.deepEqual(normaliseContent('claude'), ['claude']);
  });

  it('expands all to every type', () => {
    assert.deepEqual(normaliseContent('all'), ['skills', 'claude']);
  });

  it('gives the same list for every spelling of a set', () => {
    const expected = ['skills', 'claude'];
    for (const spelling of ['skills,claude', 'claude,skills', ' claude , skills ', 'all', 'all,skills', 'skills,skills,claude', 'claude,all']) {
      assert.deepEqual(normaliseContent(spelling), expected, spelling);
    }
  });

  it('collapses duplicates', () => {
    assert.deepEqual(normaliseContent('claude,claude'), ['claude']);
  });

  it('rejects an unknown value and names the valid values', () => {
    assert.throws(() => normaliseContent('skills,plugins'), /unknown content value "plugins"; valid values: skills, claude, all/);
  });

  it('rejects a value that differs only in case', () => {
    assert.throws(() => normaliseContent('Skills'), /unknown content value "Skills"/);
  });

  it('rejects an empty list and a blank list', () => {
    assert.throws(() => normaliseContent(''), /empty; valid values: skills, claude, all/);
    assert.throws(() => normaliseContent(' , '), /empty; valid values: skills, claude, all/);
  });

  it('rejects an empty item among valid ones', () => {
    assert.throws(() => normaliseContent('skills,'), /unknown content value ""/);
  });
});

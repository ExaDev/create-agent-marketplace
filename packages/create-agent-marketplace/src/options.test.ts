import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseFlags } from './options.ts';

describe('parseFlags', () => {
  it('reads every flag', () => {
    const flags = parseFlags([
      '--content', 'skills,claude', '--name', 'acme', '--owner', 'Acme Ltd', '--org', 'acme-org', '--licence', 'proprietary', '--examples', 'none',
      '--dir', 'out', '--template', '/t', '--template-ref', 'main', '--create-repo', 'acme-org/acme', '--yes', '--no-validate',
    ]);
    assert.equal(flags.content, 'skills,claude');
    assert.equal(flags.name, 'acme');
    assert.equal(flags.licence, 'proprietary');
    assert.equal(flags.examples, 'none');
    assert.equal(flags.createRepo, 'acme-org/acme');
    assert.equal(flags.yes, true);
    assert.equal(flags.validate, false);
  });

  it('leaves absent flags undefined so the interview can ask', () => {
    const flags = parseFlags([]);
    assert.equal(flags.content, undefined);
    assert.equal(flags.licence, undefined);
    assert.equal(flags.yes, false);
    assert.equal(flags.validate, true);
  });

  it('rejects an unknown licence and examples value', () => {
    assert.throws(() => parseFlags(['--licence', 'GPL']), /--licence must be one of MIT, proprietary/);
    assert.throws(() => parseFlags(['--examples', 'some']), /--examples must be one of keep, none/);
  });

  it('rejects a malformed repository, an unknown flag and a positional', () => {
    assert.throws(() => parseFlags(['--create-repo', 'acme']), /--create-repo must be <owner>\/<name>/);
    assert.throws(() => parseFlags(['--nope']), /Unknown option/);
    assert.throws(() => parseFlags(['stray']), /Unexpected argument/);
  });
});

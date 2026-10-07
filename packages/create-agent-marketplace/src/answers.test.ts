import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveAnswers } from './answers.ts';
import { parseFlags } from './options.ts';
import { scriptedPrompter } from './test-support.ts';

describe('resolveAnswers without a prompter', () => {
  it('applies the defaults', async () => {
    const answers = await resolveAnswers(parseFlags(['--name', 'acme', '--owner', 'Acme']), undefined);
    assert.deepEqual(answers, { name: 'acme', owner: 'Acme', org: undefined, licence: 'MIT', examples: 'keep', content: ['skills', 'claude'], dir: undefined });
  });

  it('normalises the content list', async () => {
    const answers = await resolveAnswers(parseFlags(['--name', 'acme', '--owner', 'Acme', '--content', ' claude , skills ,all']), undefined);
    assert.deepEqual(answers.content, ['skills', 'claude']);
  });

  it('requires a name and an owner', async () => {
    await assert.rejects(resolveAnswers(parseFlags(['--owner', 'Acme']), undefined), /--name is required without a prompt/);
    await assert.rejects(resolveAnswers(parseFlags(['--name', 'acme']), undefined), /--owner is required without a prompt/);
  });

  it('rejects a name the template would refuse', async () => {
    await assert.rejects(resolveAnswers(parseFlags(['--name', 'Acme_Market', '--owner', 'Acme']), undefined), /lower-case words joined by hyphens/);
  });

  it('rejects an unknown or empty content value', async () => {
    await assert.rejects(resolveAnswers(parseFlags(['--name', 'a', '--owner', 'A', '--content', 'plugins']), undefined), /unknown content value "plugins"; valid values: skills, claude, all/);
    await assert.rejects(resolveAnswers(parseFlags(['--name', 'a', '--owner', 'A', '--content', '']), undefined), /content list is empty/);
  });
});

describe('resolveAnswers with a prompter', () => {
  it('asks only for what the flags did not supply', async () => {
    const prompter = scriptedPrompter({ text: ['Acme Ltd'], select: [], multiselect: [], confirm: [] });
    const answers = await resolveAnswers(
      parseFlags(['--name', 'acme', '--org', 'acme-org', '--licence', 'MIT', '--examples', 'none', '--content', 'claude']),
      prompter,
    );
    assert.deepEqual(prompter.asked, ['Owner (display name)']);
    assert.equal(answers.owner, 'Acme Ltd');
    assert.deepEqual(answers.content, ['claude']);
  });

  it('interviews for everything and treats the content as a multi-select', async () => {
    const prompter = scriptedPrompter({ text: ['acme', 'Acme', 'acme-org'], select: ['proprietary'], multiselect: [['claude', 'skills']], confirm: [false] });
    const answers = await resolveAnswers(parseFlags([]), prompter);
    assert.deepEqual(answers, { name: 'acme', owner: 'Acme', org: 'acme-org', licence: 'proprietary', examples: 'none', content: ['skills', 'claude'], dir: undefined });
  });

  it('rejects an empty multi-select', async () => {
    const prompter = scriptedPrompter({ text: [], select: [], multiselect: [[]], confirm: [] });
    await assert.rejects(resolveAnswers(parseFlags(['--name', 'a', '--owner', 'A', '--org', 'A', '--licence', 'MIT', '--examples', 'keep']), prompter), /no content selected/);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveAnswers } from './answers.ts';
import { parseFlags } from './options.ts';
import { scriptedPrompter } from './test-support.ts';

describe('resolveAnswers without a prompter', () => {
  it('applies the defaults', async () => {
    const answers = await resolveAnswers(parseFlags(['--name', 'acme', '--owner', 'Acme']), undefined);
    assert.deepEqual(answers, { name: 'acme', marketplaceName: 'acme', owner: 'Acme', org: undefined, licence: 'MIT', examples: 'keep', content: ['skills', 'claude'], dir: undefined });
  });

  it('normalises the content list', async () => {
    const answers = await resolveAnswers(parseFlags(['--name', 'acme', '--owner', 'Acme', '--content', ' claude , skills ,all']), undefined);
    assert.deepEqual(answers.content, ['skills', 'claude']);
  });

  it('takes the marketplace name from the flag, and defaults it to the repository name', async () => {
    const named = await resolveAnswers(parseFlags(['--name', 'acme', '--marketplace-name', 'market', '--owner', 'Acme']), undefined);
    assert.equal(named.name, 'acme');
    assert.equal(named.marketplaceName, 'market');
  });

  it('rejects a marketplace name the template would refuse', async () => {
    await assert.rejects(resolveAnswers(parseFlags(['--name', 'acme', '--marketplace-name', 'Not Valid', '--owner', 'Acme']), undefined), /--marketplace-name "Not Valid": use lower-case words/);
  });

  it('rejects a different marketplace name without the claude content', async () => {
    await assert.rejects(
      resolveAnswers(parseFlags(['--name', 'acme', '--marketplace-name', 'market', '--owner', 'Acme', '--content', 'skills']), undefined),
      /--marketplace-name needs the claude content/,
    );
    const same = await resolveAnswers(parseFlags(['--name', 'acme', '--marketplace-name', 'acme', '--owner', 'Acme', '--content', 'skills']), undefined);
    assert.equal(same.marketplaceName, 'acme');
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
    const prompter = scriptedPrompter({ text: ['Acme Ltd', 'acme-market'], select: [], multiselect: [], confirm: [] });
    const answers = await resolveAnswers(
      parseFlags(['--name', 'acme', '--org', 'acme-org', '--licence', 'MIT', '--examples', 'none', '--content', 'claude']),
      prompter,
    );
    assert.deepEqual(prompter.asked, ['Owner (display name)', 'Marketplace name']);
    assert.equal(answers.owner, 'Acme Ltd');
    assert.equal(answers.marketplaceName, 'acme-market');
    assert.deepEqual(answers.content, ['claude']);
  });

  it('interviews for everything and treats the content as a multi-select', async () => {
    const prompter = scriptedPrompter({ text: ['acme', 'Acme', 'acme-org', 'acme-market'], select: ['proprietary'], multiselect: [['claude', 'skills']], confirm: [false] });
    const answers = await resolveAnswers(parseFlags([]), prompter);
    assert.deepEqual(answers, { name: 'acme', marketplaceName: 'acme-market', owner: 'Acme', org: 'acme-org', licence: 'proprietary', examples: 'none', content: ['skills', 'claude'], dir: undefined });
    assert.deepEqual(prompter.asked, ['Repository name', 'Owner (display name)', 'GitHub organisation or user', 'Licence', 'Content', 'Marketplace name', 'Include the example plugins and skills?']);
  });

  it('does not ask for a marketplace name without the claude content', async () => {
    const prompter = scriptedPrompter({ text: [], select: [], multiselect: [], confirm: [] });
    const answers = await resolveAnswers(
      parseFlags(['--name', 'acme', '--owner', 'A', '--org', 'A', '--licence', 'MIT', '--examples', 'keep', '--content', 'skills']),
      prompter,
    );
    assert.deepEqual(prompter.asked, []);
    assert.equal(answers.marketplaceName, 'acme');
  });

  it('skips the marketplace question when the flag answered it', async () => {
    const prompter = scriptedPrompter({ text: [], select: [], multiselect: [], confirm: [] });
    const answers = await resolveAnswers(
      parseFlags(['--name', 'acme', '--marketplace-name', 'market', '--owner', 'A', '--org', 'A', '--licence', 'MIT', '--examples', 'keep', '--content', 'claude']),
      prompter,
    );
    assert.deepEqual(prompter.asked, []);
    assert.equal(answers.marketplaceName, 'market');
  });

  it('rejects an empty multi-select', async () => {
    const prompter = scriptedPrompter({ text: [], select: [], multiselect: [[]], confirm: [] });
    await assert.rejects(resolveAnswers(parseFlags(['--name', 'a', '--owner', 'A', '--org', 'A', '--licence', 'MIT', '--examples', 'keep']), prompter), /no content selected/);
  });
});

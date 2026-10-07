import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { main } from './cli.ts';
import { recordingRunner, scriptedPrompter } from './test-support.ts';

function scratchDir(): string {
  const parent = mkdtempSync(join(tmpdir(), 'cam-cli-'));
  after(() => { rmSync(parent, { recursive: true }); });
  return join(parent, 'out');
}

describe('main', () => {
  it('hands the template exactly the normalised content list', async () => {
    const dir = scratchDir();
    const runner = recordingRunner();
    const lines: string[] = [];
    await main(['--yes', '--name', 'acme', '--owner', 'Acme', '--dir', dir, '--content', ' claude, skills ,claude'], { runner, prompter: undefined, log: (line) => lines.push(line) });
    const init = runner.calls.find((call) => call.args[0] === 'run');
    assert.ok(init);
    assert.equal(init.args[init.args.indexOf('--content') + 1], 'skills,claude');
    assert.ok(runner.calls.every((call) => call.command !== 'gh'));
  });

  it('rejects a bad content value before running anything', async () => {
    const runner = recordingRunner();
    await assert.rejects(main(['--yes', '--name', 'a', '--owner', 'A', '--content', 'nope'], { runner, prompter: undefined, log: () => undefined }), /unknown content value "nope"/);
    await assert.rejects(main(['--yes', '--name', 'a', '--owner', 'A', '--content', ','], { runner, prompter: undefined, log: () => undefined }), /unknown content value ""|empty/);
    assert.equal(runner.calls.length, 0);
  });

  it('creates the repository without a prompt only when --yes is given', async () => {
    const dir = scratchDir();
    const runner = recordingRunner();
    await main(['--yes', '--name', 'acme', '--owner', 'Acme', '--dir', dir, '--create-repo', 'acme-org/acme'], { runner, prompter: undefined, log: () => undefined });
    assert.equal(runner.calls.at(-1)?.command, 'gh');
  });

  it('refuses --create-repo when it can neither prompt nor assume yes', async () => {
    const runner = recordingRunner();
    await assert.rejects(main(['--name', 'acme', '--owner', 'Acme', '--create-repo', 'acme-org/acme'], { runner, prompter: undefined, log: () => undefined }), /--create-repo needs a confirmation/);
    assert.equal(runner.calls.length, 0);
  });

  it('asks before creating the repository and skips it when declined', async () => {
    const dir = scratchDir();
    const runner = recordingRunner();
    const prompter = scriptedPrompter({ text: [], select: [], multiselect: [], confirm: [false] });
    const lines: string[] = [];
    await main(
      ['--name', 'acme', '--marketplace-name', 'acme', '--owner', 'Acme', '--org', 'acme', '--licence', 'MIT', '--examples', 'keep', '--content', 'all', '--dir', dir, '--create-repo', 'acme/acme'],
      { runner, prompter, log: (line) => lines.push(line) },
    );
    assert.deepEqual(prompter.asked, ['Create the private GitHub repository acme/acme and push to it?']);
    assert.ok(runner.calls.every((call) => call.command !== 'gh'));
    assert.ok(lines.includes('Skipped creating the GitHub repository.'));
  });

  it('prints next steps naming the directory', async () => {
    const dir = scratchDir();
    const lines: string[] = [];
    await main(['--yes', '--name', 'acme', '--owner', 'Acme', '--dir', dir], { runner: recordingRunner(), prompter: undefined, log: (line) => lines.push(line) });
    assert.match(lines.join('\n'), new RegExp(`cd ${dir}`));
  });
});

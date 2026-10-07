import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import type { Answers } from './answers.ts';
import { processRunner } from './exec.ts';
import { buildInitArgs, createPrivateRepository, generate } from './generate.ts';
import { cloneTemplate, DEFAULT_TEMPLATE_URL, resolveTemplate } from './template.ts';
import { recordingRunner } from './test-support.ts';

const answers: Answers = { name: 'acme', marketplaceName: 'acme-market', owner: 'Acme Ltd', org: 'acme-org', licence: 'MIT', examples: 'keep', content: ['skills', 'claude'], dir: undefined };

describe('buildInitArgs', () => {
  it('passes exactly the normalised content list', () => {
    const args = buildInitArgs({ ...answers, content: ['claude'] }, true);
    assert.deepEqual(args, ['run', 'init', '--content', 'claude', '--name', 'acme', '--marketplace-name', 'acme-market', '--owner', 'Acme Ltd', '--org', 'acme-org', '--licence', 'MIT', '--examples', 'keep', '--yes']);
  });

  it('joins several types with a comma and omits --org when none was given', () => {
    const args = buildInitArgs({ ...answers, org: undefined }, false);
    assert.equal(args[args.indexOf('--content') + 1], 'skills,claude');
    assert.ok(!args.includes('--org'));
    assert.ok(args.includes('--no-validate'));
  });

  it('never uses a literal -- separator', () => {
    assert.ok(!buildInitArgs(answers, true).includes('--'));
  });
});

describe('generate', () => {
  it('clones the CLI version tag, starts a fresh repository, installs, initialises and commits once', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'cam-generate-'));
    after(() => { rmSync(parent, { recursive: true }); });
    const dir = join(parent, 'acme');
    const runner = recordingRunner();
    await generate(runner, { answers, dir, cliVersion: '1.2.3', template: undefined, templateRef: undefined, validate: true });
    assert.deepEqual(
      runner.calls.map(({ command, args }) => [command, ...args].join(' ')),
      [
        `git clone --depth 1 --branch v1.2.3 https://github.com/ExaDev/agent-marketplace-template.git ${dir}`,
        'git init --quiet --initial-branch main',
        'pnpm install --frozen-lockfile',
        `pnpm ${buildInitArgs(answers, true).join(' ')}`,
        'git add --all',
        'git commit --quiet --message chore: initial commit from the agent marketplace template v1.2.3',
      ],
    );
    assert.ok(!existsSync(join(dir, '.git')), 'the template history is removed before the fresh repository starts (the recording runner does not run git init)');
    assert.ok(runner.calls.slice(1).every((call) => call.cwd === dir));
  });

  it('honours the template overrides', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'cam-generate-'));
    after(() => { rmSync(parent, { recursive: true }); });
    const runner = recordingRunner();
    await generate(runner, { answers, dir: join(parent, 'x'), cliVersion: '1.2.3', template: 'https://example.com/t.git', templateRef: 'main', validate: true });
    assert.deepEqual(runner.calls[0]?.args.slice(0, 6), ['clone', '--depth', '1', '--branch', 'main', 'https://example.com/t.git']);
  });

  it('refuses a target that is not empty, before cloning anything', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'cam-generate-'));
    after(() => { rmSync(parent, { recursive: true }); });
    writeFileSync(join(parent, 'file'), 'x');
    const runner = recordingRunner();
    await assert.rejects(generate(runner, { answers, dir: parent, cliVersion: '1.2.3', template: undefined, templateRef: undefined, validate: true }), /not an empty directory/);
    assert.equal(runner.calls.length, 0);
  });

  it('clones a real local template at its tag and leaves no history', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'cam-generate-'));
    after(() => { rmSync(parent, { recursive: true }); });
    const source = join(parent, 'template');
    mkdirSync(source);
    const git = (...args: string[]): void => {
      execFileSync('git', ['-C', source, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'tag.gpgsign=false', '-c', 'commit.gpgsign=false', ...args], { stdio: 'ignore' });
    };
    git('init', '--quiet', '--initial-branch', 'main');
    writeFileSync(join(source, 'marker.txt'), 'tagged');
    git('add', 'marker.txt');
    git('commit', '--quiet', '--message', 'chore: tagged');
    git('tag', 'v9.9.9');
    writeFileSync(join(source, 'marker.txt'), 'later');
    git('commit', '--quiet', '--all', '--message', 'chore: later');

    const dir = join(parent, 'out');
    const location = resolveTemplate(source, 'v9.9.9', '0.0.0');
    await cloneTemplate(processRunner, location.source, location.ref, dir);
    assert.ok(!existsSync(join(dir, '.git')));
    assert.equal(readFileSync(join(dir, 'marker.txt'), 'utf8'), 'tagged');
  });
});

describe('createPrivateRepository', () => {
  it('always creates a private repository from the generated directory', async () => {
    const runner = recordingRunner();
    await createPrivateRepository(runner, 'acme-org/acme', '/work/acme');
    assert.deepEqual(runner.calls, [{ command: 'gh', args: ['repo', 'create', 'acme-org/acme', '--private', '--source', '.', '--push'], cwd: '/work/acme' }]);
  });
});

describe('resolveTemplate', () => {
  it('pins the default template to the tag that matches the CLI version', () => {
    assert.deepEqual(resolveTemplate(undefined, undefined, '1.4.0'), { source: DEFAULT_TEMPLATE_URL, ref: 'v1.4.0' });
    assert.deepEqual(resolveTemplate(undefined, 'main', '1.4.0'), { source: DEFAULT_TEMPLATE_URL, ref: 'main' });
  });

  it('expands owner/repo to a GitHub URL and reads an optional #ref', () => {
    assert.deepEqual(resolveTemplate('acme/market-template', undefined, '1.4.0'), { source: 'https://github.com/acme/market-template.git', ref: undefined });
    assert.deepEqual(resolveTemplate('acme/market-template#v2', undefined, '1.4.0'), { source: 'https://github.com/acme/market-template.git', ref: 'v2' });
    assert.deepEqual(resolveTemplate('acme/market-template#v2', 'main', '1.4.0'), { source: 'https://github.com/acme/market-template.git', ref: 'main' });
  });

  it('passes a git URL through, splitting a #ref suffix', () => {
    assert.deepEqual(resolveTemplate('https://example.com/t.git', undefined, '1.4.0'), { source: 'https://example.com/t.git', ref: undefined });
    assert.deepEqual(resolveTemplate('https://example.com/t.git#next', undefined, '1.4.0'), { source: 'https://example.com/t.git', ref: 'next' });
  });
});

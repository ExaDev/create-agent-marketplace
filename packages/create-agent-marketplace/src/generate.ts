import type { Answers } from './answers.ts';
import type { Runner } from './exec.ts';
import { assertTargetUsable, cloneTemplate, templateSource } from './template.ts';
import { templateTag } from './version.ts';

export interface GenerateOptions {
  readonly answers: Answers;
  /** Absolute directory to create. */
  readonly dir: string;
  readonly cliVersion: string;
  readonly template: string | undefined;
  readonly templateRef: string | undefined;
  readonly validate: boolean;
}

/**
 * The arguments for the template's own init script. The content list is exactly the normalised one and `--yes` is
 * always present, because every answer has been collected by now and the template must never prompt again.
 */
export function buildInitArgs(answers: Answers, validate: boolean): string[] {
  return [
    'run',
    'init',
    '--content',
    answers.content.join(','),
    '--name',
    answers.name,
    '--marketplace-name',
    answers.marketplaceName,
    '--owner',
    answers.owner,
    ...(answers.org === undefined ? [] : ['--org', answers.org]),
    '--licence',
    answers.licence,
    '--examples',
    answers.examples,
    '--yes',
    ...(validate ? [] : ['--no-validate']),
  ];
}

/**
 * Creates the repository: clones the template, starts a fresh history, installs, runs the template's init (which
 * personalises, validates and installs again) and makes one initial commit of the result.
 */
export async function generate(runner: Runner, options: GenerateOptions): Promise<void> {
  const { dir } = options;
  assertTargetUsable(dir);
  const ref = options.templateRef ?? templateTag(options.cliVersion);
  await cloneTemplate(runner, templateSource(options.template), ref, dir);
  await runner.run('git', ['init', '--quiet', '--initial-branch', 'main'], dir);
  await runner.run('pnpm', ['install', '--frozen-lockfile'], dir);
  await runner.run('pnpm', buildInitArgs(options.answers, options.validate), dir);
  await runner.run('git', ['add', '--all'], dir);
  await runner.run('git', ['commit', '--quiet', '--message', `chore: initial commit from the agent marketplace template ${ref}`], dir);
}

/** Creates the private GitHub repository from the generated one and pushes it. */
export async function createPrivateRepository(runner: Runner, repository: string, dir: string): Promise<void> {
  await runner.run('gh', ['repo', 'create', repository, '--private', '--source', '.', '--push'], dir);
}

import { resolve } from 'node:path';
import { resolveAnswers, type Prompter } from './answers.ts';
import { processRunner, type Runner } from './exec.ts';
import { createPrivateRepository, generate } from './generate.ts';
import { parseFlags, USAGE } from './options.ts';
import { CancelledError, clackPrompter } from './prompter.ts';
import { ownVersion } from './version.ts';

/** The terminal and process pieces the CLI depends on, injectable for tests. */
export interface CliEnvironment {
  readonly runner: Runner;
  /** The interview, or undefined when the session cannot be interactive. */
  readonly prompter: Prompter | undefined;
  readonly log: (line: string) => void;
}

/** The interview runs only when attached to a terminal on both ends. */
function defaultEnvironment(interactive: boolean): CliEnvironment {
  return { runner: processRunner, prompter: interactive ? clackPrompter : undefined, log: console.log };
}

/**
 * Runs the CLI. Resolves when generation (and, if asked for, repository creation) completed and rejects with the
 * reason otherwise. `argv` excludes the node binary and script path.
 */
export async function main(argv: readonly string[], environment?: CliEnvironment): Promise<void> {
  const flags = parseFlags(argv);
  if (flags.help) {
    console.log(USAGE);
    return;
  }
  const version = ownVersion();
  if (flags.version) {
    console.log(version);
    return;
  }
  const interactive = !flags.yes && process.stdin.isTTY && process.stdout.isTTY;
  const { runner, prompter, log } = environment ?? defaultEnvironment(interactive);
  if (flags.createRepo !== undefined && flags.yes === false && prompter === undefined) {
    throw new Error('--create-repo needs a confirmation: run it in a terminal, or add --yes');
  }

  const answers = await resolveAnswers(flags, prompter);
  const dir = resolve(answers.dir ?? answers.name);
  await generate(runner, { answers, dir, cliVersion: version, template: flags.template, templateRef: flags.templateRef, validate: flags.validate });

  if (flags.createRepo !== undefined) {
    const confirmed = flags.yes || (prompter !== undefined && (await prompter.confirm(`Create the private GitHub repository ${flags.createRepo} and push to it?`, false)));
    if (confirmed) await createPrivateRepository(runner, flags.createRepo, dir);
    else log('Skipped creating the GitHub repository.');
  }

  log(nextSteps(dir, flags.createRepo !== undefined));
}

function nextSteps(dir: string, repositoryRequested: boolean): string {
  const lines = ['', `Created ${dir}`, '', 'Next steps:', `  cd ${dir}`, '  read README.md and CONTRIBUTING.md'];
  if (!repositoryRequested) lines.push('  gh repo create <owner>/<name> --private --source . --push   (when you want it on GitHub)');
  return lines.join('\n');
}

/** Runs `main` for a process: reports a failure on stderr and sets the exit code instead of throwing. */
export async function runCli(argv: readonly string[]): Promise<void> {
  try {
    await main(argv);
  } catch (error) {
    if (!(error instanceof CancelledError)) console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

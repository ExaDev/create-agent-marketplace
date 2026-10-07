import { mkdirSync } from 'node:fs';
import type { Prompter } from './answers.ts';
import type { Runner } from './exec.ts';

export interface RecordedCall {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string | undefined;
}

/** A runner that records each call and, for `git clone`, creates the target with a `.git` directory as the real one would. */
export function recordingRunner(): Runner & { readonly calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  return {
    calls,
    run(command, args, cwd) {
      calls.push({ command, args, cwd });
      if (command === 'git' && args[0] === 'clone') {
        const target = args.at(-1);
        if (target === undefined) throw new Error('git clone without a target');
        mkdirSync(`${target}/.git`, { recursive: true });
      }
      return Promise.resolve();
    },
  };
}

/** A prompter that answers from fixed values and records what it was asked. */
export function scriptedPrompter(answers: { text: string[]; select: string[]; multiselect: string[][]; confirm: boolean[] }): Prompter & { readonly asked: string[] } {
  const asked: string[] = [];
  const next = <T>(queue: T[], message: string): T => {
    asked.push(message);
    const value = queue.shift();
    if (value === undefined) throw new Error(`no scripted answer for "${message}"`);
    return value;
  };
  return {
    asked,
    text: (message) => Promise.resolve(next(answers.text, message)),
    select: <T extends string>(message: string, choices: readonly T[]) => {
      const picked = next(answers.select, message);
      const match = choices.find((choice) => choice === picked);
      if (match === undefined) throw new Error(`"${picked}" is not a choice for "${message}"`);
      return Promise.resolve(match);
    },
    multiselect: <T extends string>(message: string, choices: readonly T[]) => {
      const picked = next(answers.multiselect, message);
      return Promise.resolve(choices.filter((choice) => picked.includes(choice)));
    },
    confirm: (message) => Promise.resolve(next(answers.confirm, message)),
  };
}

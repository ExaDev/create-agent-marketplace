import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Runner } from './exec.ts';
import { templateTag } from './version.ts';

/** Where the template lives when no override is given. */
export const DEFAULT_TEMPLATE_URL = 'https://github.com/ExaDev/agent-marketplace-template.git';

/** A template location ready for `git clone`: the repository to clone and the ref to check out, where `undefined` means the repository's default branch. */
export interface TemplateLocation {
  readonly source: string;
  readonly ref: string | undefined;
}

/** `owner/repo`, optionally followed by `#ref`, the same shorthand `claude plugin marketplace add` accepts for a GitHub repository. */
const GITHUB_SHORTHAND = /^([\w.-]+\/[\w.-]+)(?:#(.+))?$/;

/**
 * Resolves what `--template` names. With no value the ExaDev template is cloned at the tag that matches the CLI's
 * version. Otherwise the value is, in this order: an existing local path (turned into a `file://` URL, because git
 * ignores `--depth` for a plain path), an `owner/repo[#ref]` GitHub shorthand, or a git URL optionally ending in
 * `#ref`. A custom template has no tag that matches this CLI's version, so its ref is the explicit `--template-ref`,
 * then the `#ref` suffix, then the repository's default branch.
 */
export function resolveTemplate(template: string | undefined, templateRef: string | undefined, cliVersion: string): TemplateLocation {
  if (template === undefined) return { source: DEFAULT_TEMPLATE_URL, ref: templateRef ?? templateTag(cliVersion) };
  const local = resolve(template);
  if (existsSync(local)) return { source: pathToFileURL(local).href, ref: templateRef };
  const shorthand = GITHUB_SHORTHAND.exec(template);
  if (shorthand?.[1] !== undefined) return { source: `https://github.com/${shorthand[1]}.git`, ref: templateRef ?? shorthand[2] };
  const hash = template.lastIndexOf('#');
  if (hash === -1) return { source: template, ref: templateRef };
  return { source: template.slice(0, hash), ref: templateRef ?? template.slice(hash + 1) };
}

/** Throws unless `dir` does not exist or is an empty directory, so a generation never mixes into existing files. */
export function assertTargetUsable(dir: string): void {
  if (!existsSync(dir)) return;
  if (!statSync(dir).isDirectory() || readdirSync(dir).length > 0) throw new Error(`${dir} already exists and is not an empty directory`);
}

/** Clones `ref` of the template (the default branch when `ref` is undefined) into `dir` at depth one and removes its history, leaving the plain files. */
export async function cloneTemplate(runner: Runner, source: string, ref: string | undefined, dir: string): Promise<void> {
  await runner.run('git', ['clone', '--depth', '1', ...(ref === undefined ? [] : ['--branch', ref]), source, dir], undefined);
  rmSync(`${dir}/.git`, { recursive: true });
}

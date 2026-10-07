import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Runner } from './exec.ts';

/** Where the template lives when no override is given. */
export const DEFAULT_TEMPLATE_URL = 'https://github.com/ExaDev/agent-marketplace-template.git';

/**
 * A local path becomes a `file://` URL: git ignores `--depth` for a plain path, and a shallow clone behaves the same
 * for a local template as for the real one only through the URL form. Anything that is not an existing local path is
 * handed to git as given.
 */
export function templateSource(template: string | undefined): string {
  if (template === undefined) return DEFAULT_TEMPLATE_URL;
  const local = resolve(template);
  return existsSync(local) ? pathToFileURL(local).href : template;
}

/** Throws unless `dir` does not exist or is an empty directory, so a generation never mixes into existing files. */
export function assertTargetUsable(dir: string): void {
  if (!existsSync(dir)) return;
  if (!statSync(dir).isDirectory() || readdirSync(dir).length > 0) throw new Error(`${dir} already exists and is not an empty directory`);
}

/** Clones `ref` of the template into `dir` at depth one and removes its history, leaving the plain files. */
export async function cloneTemplate(runner: Runner, source: string, ref: string, dir: string): Promise<void> {
  await runner.run('git', ['clone', '--depth', '1', '--branch', ref, source, dir], undefined);
  rmSync(`${dir}/.git`, { recursive: true });
}

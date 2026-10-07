import { readFileSync } from 'node:fs';

/**
 * This package's own version, read from its package.json. The source and the compiled output sit one directory below
 * the package root, so the same relative path resolves in both. A package that reuses the CLI (the alias) still
 * reports this version, because the file is found from this module's location, not from the caller's.
 */
export function ownVersion(): string {
  const manifest: unknown = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  if (typeof manifest === 'object' && manifest !== null && 'version' in manifest && typeof manifest.version === 'string') return manifest.version;
  throw new Error('package.json has no version');
}

/** The template tag that belongs to a CLI version. */
export function templateTag(version: string): string {
  return `v${version}`;
}

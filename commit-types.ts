import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/** How a commit type affects the version of the package it touches. `false` means no release. */
export type ReleaseImpact = 'minor' | 'patch' | false;

export interface CommitType {
  type: string;
  description: string;
  release: ReleaseImpact;
}

/** The single list of commit types: commitlint accepts exactly these and semantic-release derives its release rules from them. */
export const COMMIT_TYPES: readonly CommitType[] = [
  { type: 'feat', description: 'A new capability for users of the CLI', release: 'minor' },
  { type: 'fix', description: 'A bug fix in shipped code', release: 'patch' },
  { type: 'perf', description: 'A change that makes shipped code cheaper to run', release: 'patch' },
  { type: 'revert', description: 'Reverts an earlier commit', release: 'patch' },
  { type: 'docs', description: 'Documentation only', release: false },
  { type: 'style', description: 'Formatting with no change in meaning', release: false },
  { type: 'refactor', description: 'A restructure with no change in behaviour', release: false },
  { type: 'test', description: 'Tests only', release: false },
  { type: 'build', description: 'Build system or dependency changes', release: false },
  { type: 'ci', description: 'Continuous integration configuration', release: false },
  { type: 'chore', description: 'Maintenance that touches no shipped code', release: false },
];

export const COMMIT_TYPE_NAMES: readonly string[] = COMMIT_TYPES.map(({ type }) => type);

/**
 * Commits the release tool writes itself: its release commits and its dependency-bump commits both end in
 * `[skip ci]`. commitlint ignores them.
 */
export const RELEASE_TOOL_COMMIT = /^chore\((?:release|deps)\):/;

/** Scopes allowed besides the package names: `deps` and `release` are what the release tool writes, the rest name areas that are not a package. */
export const FIXED_SCOPES: readonly string[] = ['deps', 'release', 'ci', 'docs', 'repo'];

/** Release rules for @semantic-release/commit-analyzer: breaking changes are major, then each type's own impact. */
export const RELEASE_RULES: readonly { breaking?: true; type?: string; release: 'major' | ReleaseImpact }[] = [
  { breaking: true, release: 'major' },
  ...COMMIT_TYPES.map(({ type, release }) => ({ type, release })),
];

/** Every scope a commit may use in the repository at `root`: its package directory names plus the fixed scopes. */
export function allowedScopes(root: string): string[] {
  const packages = readdirSync(join(root, 'packages'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  return [...packages, ...FIXED_SCOPES];
}

import type { ReleaseWorkspaceOptions } from '@exadev/semantic-release-workspace';
import { RELEASE_RULES } from './commit-types.ts';

/**
 * Both packages release through the tool's default publish pipeline (changelog, npm, GitHub release, git).
 *
 * The alias `create-claude-marketplace` depends on `create-agent-marketplace` at an exact version. When the real
 * package releases, the tool rewrites that range to the new version in the same run, commits it with the lockfile
 * and releases the alias as a patch, so the alias always pins the version released with it. An exact range is a
 * shape the tool can rewrite; a `workspace:` range would reach the registry verbatim and could not be installed.
 */
const config: ReleaseWorkspaceOptions = {
  // The default per-package mode needs @semantic-release/git, which the default plugin list includes.
  commitStrategy: 'per-package',
  analyzeCommits: { preset: 'conventionalcommits', releaseRules: [...RELEASE_RULES] },
  generateNotes: { preset: 'conventionalcommits' },
};

export default config;

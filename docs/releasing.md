# Releasing

Both packages are released from `main` by [`@exadev/semantic-release-workspace`](https://www.npmjs.com/package/@exadev/semantic-release-workspace), configured in `release-workspace.config.ts`. A commit belongs to a package when it touches that package's files, and the conventional commit type sets the bump (`commit-types.ts` is the single list, feeding commitlint and the release rules). Each released package gets its own tag (`<package>@<version>`), changelog, GitHub release and npm publish, in dependency order.

## Keeping the alias in lockstep

`create-claude-marketplace` declares `create-agent-marketplace` at an exact version, for example `"create-agent-marketplace": "1.4.0"`. The release tool treats an exact version as a range it can rewrite. When `create-agent-marketplace` releases a new version, then in the same run, before the alias's turn:

1. the alias's dependency is rewritten to the new exact version,
2. the lockfile is regenerated and committed with it,
3. the alias is released as a patch, even if nothing else in it changed.

So a published `create-claude-marketplace` always pins the real package that was released with it, and installing the alias installs exactly that CLI and therefore generates from exactly that template tag. The alias's own version can run ahead of the real package's (it also patches for changes of its own), which is harmless: only the pinned dependency determines behaviour.

The workspace uses `linkWorkspacePackages: true` so that the exact range resolves to the workspace copy during development and in CI. A `workspace:` range would not work, because it would reach the registry unchanged and could not be installed; the release tool rejects it for publishable packages.

## The template tag

The CLI clones the template tag `v<version>` of its own version. Before a CLI version is published, the template must already carry that tag, so cut the template release first and the CLI release second. The release workflow's `template-selfcheck` job checks the CLI against the template's `main`, not against the tag, because the tag for an unreleased version does not exist yet.

## Publishing

The release job publishes with npm trusted publishing (OIDC). It holds `id-token: write` and no npm token, and provenance attestations are generated automatically. Each of the two packages needs a trusted publisher registered on npm for this repository and the `ci.yml` workflow before the first release can publish.

The release tool pushes release commits and tags directly to `main`. On a repository whose ruleset requires pull requests, the identity that pushes must be a bypass actor; supply it as the `RELEASE_TOKEN` repository secret. Without the secret the job falls back to the workflow token, which works where `main` accepts a direct push.

The compiled output is built by the workflow (`pnpm run build`) before the release step and is never committed. The packages define no lifecycle scripts, so a publish does not build by itself: always build first.

## Dry run

`pnpm run release --dry-run` in a clean checkout with a pushable `origin` reports which packages would release, with which versions and dependency rewrites, without tagging, committing or publishing anything.

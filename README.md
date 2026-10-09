# create-agent-marketplace

[![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white)](https://github.com/ExaDev/create-agent-marketplace) [![npm](https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white)](https://www.npmjs.com/package/create-agent-marketplace) [![Release](https://img.shields.io/github/v/release/ExaDev/create-agent-marketplace)](https://github.com/ExaDev/create-agent-marketplace/releases/latest) [![CI](https://img.shields.io/github/actions/workflow/status/ExaDev/create-agent-marketplace/ci.yml?branch=main)](https://github.com/ExaDev/create-agent-marketplace/actions)

An initializer that creates an agent marketplace from [ExaDev/agent-marketplace-template](https://github.com/ExaDev/agent-marketplace-template): a Claude Code plugin marketplace, a repository of agent skills, or both, with validation, commit lint and per-plugin releases already wired up.

It is published under two names that behave identically. `create-agent-marketplace` is the real package, and `create-claude-marketplace` is an alias that depends on it at an exact version and runs the same CLI.

[![npm downloads chart, log scale](https://shieldcn.dev/chart/npm/create-agent-marketplace.svg?bg=transparent&logo=false&yScale=log)](https://www.npmjs.com/package/create-agent-marketplace)

## Usage

```sh
npm create agent-marketplace
npm create claude-marketplace
```

Attached to a terminal, it interviews you for the repository name, owner, GitHub organisation, contact for security and conduct reports, licence (MIT or proprietary), content (a multi-select of `skills` and `claude`), the marketplace name (only with `claude`, defaulting to the repository name) and whether to keep the example plugins and skills. Anything you give as a flag is not asked.

For a run with no prompts, pass flags. npm needs a literal `--` before them so that it hands them to the initializer instead of reading them itself:

```sh
npm create agent-marketplace -- --name acme-marketplace --owner "Acme Ltd" --contact security@acme.example --content skills,claude --yes
```

Other package managers run the same binary: `pnpm create agent-marketplace --name acme-marketplace --owner "Acme Ltd" --contact security@acme.example --yes`. A globally installed copy takes precedence over a fetched one, and `create-agent-marketplace@<version>` pins a version.

| Flag | Meaning |
| --- | --- |
| `--content <list>` | Content types to generate: `skills`, `claude` or `all`, comma-separated. Default `all`. |
| `--name <name>` | Repository and package name: lower-case words joined by hyphens. |
| `--marketplace-name <name>` | Name of the Claude Code marketplace, used in `marketplace.json` and the install commands: lower-case words joined by hyphens. Defaults to `--name`. It needs the `claude` content, because the other content has no marketplace. |
| `--owner <name>` | Owner display name, used for the marketplace owner, plugin authors and the licence. |
| `--contact <email-or-url>` | Email address or http(s) URL that receives security reports and code of conduct reports, written to `SECURITY.md` and `CODE_OF_CONDUCT.md`. Required for every content set. |
| `--org <name>` | GitHub organisation or user for repository URLs. Defaults to the owner. |
| `--licence <kind>` | `MIT` (default) or `proprietary`. |
| `--examples <kind>` | `keep` (default) or `none`. |
| `--dir <path>` | Directory to create. Defaults to `./<name>`. It must not exist or must be empty. |
| `--create-repo <owner/name>` | Also create that private GitHub repository from the result and push it. Asks for confirmation first; with `--yes` it does not ask. |
| `--template <repo>` | Template to generate from instead of the ExaDev template: `owner/repo` or `owner/repo#ref` for a GitHub repository (as `claude plugin marketplace add` takes), a git URL optionally ending in `#ref`, or a local path. See [Using another template](#using-another-template). |
| `--template-ref <ref>` | Tag or branch of the template to clone. Overrides a `#ref` suffix. |
| `--yes` | Never prompt. `--name`, `--owner` and `--contact` are then required and the other answers take their defaults. |
| `--no-validate` | Skip the install and validation the template's init normally runs at the end. |

`--create-repo` is the only step that touches GitHub and it never creates a public repository (`gh repo create --private --source . --push`).

### The content option

`--content <list>` takes a comma-separated set of content types: `skills`, `claude` or `all` (shorthand for `skills,claude`, and the default). It is also a multi-select in the interview, and the template's own init script applies it, so the template repository stays canonical. The CLI normalises the list before passing it on: it splits on commas, trims, expands `all`, collapses duplicates and ignores order, and an unknown value or an empty list is an error naming the valid values. The template receives exactly the normalised list.

Content types are additive modules, so there are three valid sets:

- `claude`: a Claude plugin marketplace. Keeps `.claude-plugin/`, `plugins/`, per-plugin releases and plugin validation. Drops the `skills` CLI docs and the `npx skills add` listing check.
- `skills`: a generic skills repository, `skills/<name>/SKILL.md` at the root, found natively by the `skills` CLI and usable by any agent. Drops everything plugin-shaped (no `.claude-plugin/`, `plugins/`, plugin versions, plugin validation, per-plugin release). Keeps commit lint, CI and the skill front-matter and unique-name check.
- `skills,claude` (`all`): the plugin marketplace plus the `skills` CLI docs and listing check. Skills still live once, inside plugins, so the layout equals `claude` (the `skills` CLI discovers plugin skills from the marketplace entries regardless, so `claude` alone cannot hide them; it just does not advertise or test it).

### What it does

1. Clones the template at the git tag that matches this CLI's own version (see below), at depth one.
2. Removes the template's history and starts a fresh repository on `main`.
3. Installs the template's dependencies and runs its `init` script with the normalised arguments, which personalises the files, installs again and validates the result.
4. Makes one initial commit.
5. With `--create-repo` and a confirmation, creates the private repository and pushes.
6. Prints next steps.

Nothing here uses lifecycle scripts, so it works with `ignore-scripts=true`.

## Versions and template tags

A version of this CLI always generates from the template tag named after it: version `1.4.0` clones the template tag `v1.4.0`. An older CLI therefore keeps generating what it generated when it was released, and a run is reproducible from the version alone. Releasing a new CLI version needs a template tag of the same name first.

`create-claude-marketplace` depends on `create-agent-marketplace` at an exact version, and its release is cut in the same run as the real package's, so the alias at any version runs the real package it was released with. See [docs/releasing.md](docs/releasing.md).

### Using another template

`--template` accepts the same shorthand as `claude plugin marketplace add`: `acme/our-marketplace-template`, `acme/our-marketplace-template#v2`, a full git URL, or a local path (checked first, then the shorthand). Only the ExaDev template is pinned to a tag that matches this CLI's version. Any other template is cloned at `--template-ref`, then the `#ref` suffix, then the repository's default branch.

A custom template has to follow the contract this CLI relies on: a `pnpm-lock.yaml` that installs with `pnpm install --frozen-lockfile`, and a `pnpm run init` script that accepts `--content`, `--name`, `--marketplace-name`, `--owner`, `--org`, `--contact`, `--licence`, `--examples`, `--yes` and `--no-validate`. The simplest way to meet it is a fork of the ExaDev template.

### Package age limits

A consumer who sets a minimum release age (`min-release-age` in npm, `minimumReleaseAge` in pnpm) is not offered a version of either package until it is old enough, so `npm create` reports that no matching version exists for a freshly published release. Wait, pin an older version, or exclude these two package names from the limit for your own installs.

## Development

```sh
pnpm install
pnpm run typecheck
pnpm run test
pnpm run build
```

Source is TypeScript, run with `tsx` in development and compiled with `tsc` for publishing. The compiled output in `dist/` is gitignored and built by CI before a release.

Developing against an unreleased template uses the same options: a local path is cloned through a `file://` URL.

```sh
node packages/create-agent-marketplace/dist/bin.js --template ../agent-marketplace-template --template-ref main --content skills --name demo --owner Demo --contact demo@example.com --yes
```

CI runs typecheck, tests, build and commit lint on pull requests. The release workflow first runs a `template-selfcheck` job that generates from the template for each of `skills`, `claude` and `skills,claude` and validates each result, and only then releases.

## Licence

MIT. See [LICENSE](LICENSE).

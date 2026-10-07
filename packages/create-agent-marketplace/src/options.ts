import { parseArgs } from 'node:util';

export const LICENCES = ['MIT', 'proprietary'] as const;
export type Licence = (typeof LICENCES)[number];

export const EXAMPLES = ['keep', 'none'] as const;
export type Examples = (typeof EXAMPLES)[number];

/** What the command line said. Anything absent is undefined so the interview can ask for it. */
export interface Flags {
  readonly content: string | undefined;
  readonly name: string | undefined;
  readonly marketplaceName: string | undefined;
  readonly owner: string | undefined;
  readonly org: string | undefined;
  readonly licence: Licence | undefined;
  readonly examples: Examples | undefined;
  readonly dir: string | undefined;
  readonly template: string | undefined;
  readonly templateRef: string | undefined;
  /** `owner/name` of the private GitHub repository to create, when asked for. */
  readonly createRepo: string | undefined;
  readonly yes: boolean;
  readonly validate: boolean;
  readonly help: boolean;
  readonly version: boolean;
}

export const USAGE = `Usage: create-agent-marketplace [options]

Creates an agent marketplace from the ExaDev template, at the template tag that matches this CLI's version.
Without --yes, and when attached to a terminal, anything not given as a flag is asked for.

  --content <list>     skills, claude or all, comma-separated (default all)
  --name <name>        repository and package name (lower-case, hyphenated)
  --marketplace-name <name>
                       Claude Code marketplace name (lower-case, hyphenated; default: --name; needs the claude content)
  --owner <name>       owner display name for the marketplace, plugin authors and licence
  --org <name>         GitHub organisation or user for repository URLs (default: the owner)
  --licence <kind>     MIT or proprietary (default MIT)
  --examples <kind>    keep or none (default keep)
  --dir <path>         directory to create (default: ./<name>)
  --create-repo <o/n>  also create the private GitHub repository <o/n> from the result and push it (asks first)
  --yes                never prompt; --name and --owner are then required
  --no-validate        skip the template's install and validation step
  --help               show this help
  --version            show this CLI's version

For development and tests of this CLI only:

  --template <repo>      template to generate from: owner/repo[#ref], a git URL or a local path (default: the ExaDev template)
  --template-ref <ref>   tag or branch to clone (default: v<this CLI's version> for the ExaDev template, otherwise the repository's default branch)`;

function parseChoice<T extends string>(value: string | undefined, valid: readonly T[], flag: string): T | undefined {
  if (value === undefined) return undefined;
  const match = valid.find((candidate) => candidate === value);
  if (match === undefined) throw new Error(`${flag} must be one of ${valid.join(', ')}, not "${value}"`);
  return match;
}

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** Parses the command line. Unknown flags and malformed values throw. */
export function parseFlags(argv: readonly string[]): Flags {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      content: { type: 'string' },
      name: { type: 'string' },
      'marketplace-name': { type: 'string' },
      owner: { type: 'string' },
      org: { type: 'string' },
      licence: { type: 'string' },
      examples: { type: 'string' },
      dir: { type: 'string' },
      template: { type: 'string' },
      'template-ref': { type: 'string' },
      'create-repo': { type: 'string' },
      yes: { type: 'boolean', default: false },
      'no-validate': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
      version: { type: 'boolean', default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  const createRepo = values['create-repo'];
  if (createRepo !== undefined && !REPOSITORY_PATTERN.test(createRepo)) throw new Error(`--create-repo must be <owner>/<name>, not "${createRepo}"`);
  return {
    content: values.content,
    name: values.name,
    marketplaceName: values['marketplace-name'],
    owner: values.owner,
    org: values.org,
    licence: parseChoice(values.licence, LICENCES, '--licence'),
    examples: parseChoice(values.examples, EXAMPLES, '--examples'),
    dir: values.dir,
    template: values.template,
    templateRef: values['template-ref'],
    createRepo,
    yes: values.yes,
    validate: !values['no-validate'],
    help: values.help,
    version: values.version,
  };
}

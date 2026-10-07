import { CONTENT_TYPES, normaliseContent, type ContentType } from './content.ts';
import { LICENCES, type Examples, type Flags, type Licence } from './options.ts';

/** Everything generation needs, with every default applied and every value checked. */
export interface Answers {
  /** Repository and package name, and the default directory. */
  readonly name: string;
  /** Name of the Claude Code marketplace; equals `name` unless asked for, and can differ only when `content` includes `claude`. */
  readonly marketplaceName: string;
  readonly owner: string;
  /** Written only when given or asked for; the template defaults it to the owner. */
  readonly org: string | undefined;
  readonly licence: Licence;
  readonly examples: Examples;
  /** Normalised: canonical order, no duplicates, `all` expanded. */
  readonly content: readonly ContentType[];
  readonly dir: string | undefined;
}

/** The questions the interview can put. Each method resolves with the answer or rejects when the user cancels. */
export interface Prompter {
  text(message: string, options: { readonly initial?: string; readonly validate?: (value: string) => string | undefined }): Promise<string>;
  select<T extends string>(message: string, choices: readonly T[], initial: T): Promise<T>;
  multiselect<T extends string>(message: string, choices: readonly T[], initial: readonly T[]): Promise<T[]>;
  confirm(message: string, initial: boolean): Promise<boolean>;
}

/** The template rejects any other name; checking here fails before anything is cloned. */
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validateName(name: string): string | undefined {
  return NAME_PATTERN.test(name) ? undefined : 'use lower-case words joined by hyphens';
}

function validateNonEmpty(value: string): string | undefined {
  return value.trim() === '' ? 'a value is required' : undefined;
}

/**
 * Combines flags with answers. With a `prompter`, every value the flags did not supply is asked for. Without one, only
 * `--name` and `--owner` are required and everything else takes its default (content `all`, licence MIT, examples keep).
 */
export async function resolveAnswers(flags: Flags, prompter: Prompter | undefined): Promise<Answers> {
  const name = flags.name ?? (await required(prompter, '--name', 'Repository name', { validate: validateName }));
  const nameProblem = validateName(name);
  if (nameProblem !== undefined) throw new Error(`--name "${name}": ${nameProblem}`);
  const owner = flags.owner ?? (await required(prompter, '--owner', 'Owner (display name)', { validate: validateNonEmpty }));
  const org = flags.org ?? (prompter === undefined ? undefined : await prompter.text('GitHub organisation or user', { initial: owner, validate: validateNonEmpty }));
  const licence = flags.licence ?? (prompter === undefined ? 'MIT' : await prompter.select('Licence', LICENCES, 'MIT'));
  const content =
    flags.content !== undefined
      ? normaliseContent(flags.content)
      : prompter === undefined
        ? normaliseContent('all')
        : await askContent(prompter);
  const marketplaceName = await resolveMarketplaceName(flags.marketplaceName, name, content, prompter);
  const examples =
    flags.examples ??
    (prompter === undefined ? 'keep' : (await prompter.confirm('Include the example plugins and skills?', true)) ? 'keep' : 'none');
  return { name, marketplaceName, owner, org, licence, examples, content, dir: flags.dir };
}

/** The marketplace exists only with the `claude` content, so a name for it is asked for, and accepted, only then. */
async function resolveMarketplaceName(flag: string | undefined, name: string, content: readonly ContentType[], prompter: Prompter | undefined): Promise<string> {
  const hasMarketplace = content.includes('claude');
  if (!hasMarketplace) {
    if (flag !== undefined && flag !== name) throw new Error('--marketplace-name needs the claude content: without it the repository has no marketplace');
    return name;
  }
  const marketplaceName = flag ?? (prompter === undefined ? name : (await prompter.text('Marketplace name', { initial: name, validate: validateName })).trim());
  const problem = validateName(marketplaceName);
  if (problem !== undefined) throw new Error(`--marketplace-name "${marketplaceName}": ${problem}`);
  return marketplaceName;
}

async function askContent(prompter: Prompter): Promise<ContentType[]> {
  const chosen = await prompter.multiselect('Content', CONTENT_TYPES, CONTENT_TYPES);
  if (chosen.length === 0) throw new Error(`no content selected; valid values: ${CONTENT_TYPES.join(', ')}`);
  return normaliseContent(chosen.join(','));
}

async function required(
  prompter: Prompter | undefined,
  flag: string,
  message: string,
  options: { readonly validate: (value: string) => string | undefined },
): Promise<string> {
  if (prompter === undefined) throw new Error(`${flag} is required without a prompt`);
  return (await prompter.text(message, options)).trim();
}

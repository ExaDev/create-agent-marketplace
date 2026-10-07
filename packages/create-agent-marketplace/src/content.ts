/** The content types a generated repository can hold, in the canonical order of a normalised list. */
export const CONTENT_TYPES = ['skills', 'claude'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

/** The shorthand for every content type. */
const ALL = 'all';

/** The values `--content` accepts, as named in error messages. */
export const CONTENT_VALUES: readonly string[] = [...CONTENT_TYPES, ALL];

function isContentType(value: string): value is ContentType {
  return CONTENT_TYPES.some((type) => type === value);
}

/**
 * Turns a comma-separated content list into the canonical selection the template's init script receives.
 *
 * Splits on commas and trims each item. `all` expands to every content type, duplicates collapse and the result is
 * ordered by `CONTENT_TYPES`, so any spelling of the same set yields the same list. An empty list, an empty item
 * or an unknown value throws an error naming the valid values.
 */
export function normaliseContent(raw: string): ContentType[] {
  const valid = CONTENT_VALUES.join(', ');
  const items = raw.split(',').map((item) => item.trim());
  if (items.every((item) => item === '')) throw new Error(`the content list is empty; valid values: ${valid}`);
  const chosen = new Set<ContentType>();
  for (const item of items) {
    if (item === ALL) {
      for (const type of CONTENT_TYPES) chosen.add(type);
    } else if (isContentType(item)) {
      chosen.add(item);
    } else {
      throw new Error(`unknown content value "${item}"; valid values: ${valid}`);
    }
  }
  return CONTENT_TYPES.filter((type) => chosen.has(type));
}

import type { UserConfig } from '@commitlint/types';
import { allowedScopes, COMMIT_TYPE_NAMES, RELEASE_TOOL_COMMIT } from './commit-types.ts';

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => RELEASE_TOOL_COMMIT.test(message)],
  rules: {
    'type-enum': [2, 'always', [...COMMIT_TYPE_NAMES]],
    'scope-enum': [2, 'always', allowedScopes(import.meta.dirname)],
  },
};

export default config;

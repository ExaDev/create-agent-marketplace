import { cancel, confirm, isCancel, multiselect, select, text } from '@clack/prompts';
import type { Prompter } from './answers.ts';

/** Thrown when the user cancels a prompt. */
export class CancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'CancelledError';
  }
}

function cancelled(): CancelledError {
  cancel('Cancelled.');
  return new CancelledError();
}

/** Maps a value the prompt returned back onto the typed choice it came from. */
function choiceFor<T extends string>(choices: readonly T[], picked: string): T {
  const match = choices.find((choice) => choice === picked);
  if (match === undefined) throw new Error(`the prompt returned "${picked}", which is not one of ${choices.join(', ')}`);
  return match;
}

/** The interactive prompter, backed by @clack/prompts. */
export const clackPrompter: Prompter = {
  async text(message, options) {
    const answer = await text({
      message,
      ...(options.initial === undefined ? {} : { initialValue: options.initial }),
      ...(options.validate === undefined ? {} : { validate: (value) => options.validate?.(value ?? '') }),
    });
    if (isCancel(answer)) throw cancelled();
    return answer;
  },
  async select(message, choices, initial) {
    const answer = await select<string>({ message, options: choices.map((value) => ({ value, label: value })), initialValue: initial });
    if (isCancel(answer)) throw cancelled();
    return choiceFor(choices, answer);
  },
  async multiselect(message, choices, initial) {
    const answer = await multiselect<string>({ message, options: choices.map((value) => ({ value, label: value })), initialValues: [...initial], required: true });
    if (isCancel(answer)) throw cancelled();
    return answer.map((picked) => choiceFor(choices, picked));
  },
  async confirm(message, initial) {
    const answer = await confirm({ message, initialValue: initial });
    if (isCancel(answer)) throw cancelled();
    return answer;
  },
};

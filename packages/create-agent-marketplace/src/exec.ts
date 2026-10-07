import { spawn } from 'node:child_process';

/** Runs commands in a directory with the terminal attached. Injected so generation can be tested without running anything. */
export interface Runner {
  run(command: string, args: readonly string[], cwd: string | undefined): Promise<void>;
}

/** Variables a git hook sets. A child started from inside a hook would otherwise act on the hook's repository. */
const GIT_REPOSITORY_VARIABLES = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE'];

function childEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const name of GIT_REPOSITORY_VARIABLES) delete env[name];
  return env;
}

export const processRunner: Runner = {
  run(command, args, cwd) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, [...args], { cwd, env: childEnvironment(), stdio: 'inherit' });
      child.on('error', (error) => {
        reject(new Error(`could not start ${command}: ${error.message}`));
      });
      child.on('close', (code, signal) => {
        if (code === 0) resolve();
        else reject(new Error(`${[command, ...args].join(' ')} ${signal === null ? `exited with code ${String(code)}` : `was stopped by ${signal}`}`));
      });
    });
  },
};

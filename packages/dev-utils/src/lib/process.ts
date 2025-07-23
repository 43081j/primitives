import { platform } from 'node:os'

import { satisfies } from 'semver'
import type { ChildProcess } from 'node:child_process'

// 1 second
const SERVER_KILL_TIMEOUT = 1e3

export interface ProcessRef {
  ps?: ChildProcess
}

export const killProcess = (ps?: ChildProcess) => {
  // If the process is no longer running, there's nothing left to do.
  if (!ps || ps.exitCode !== null) {
    return
  }

  return new Promise<void>((resolve, reject) => {
    void ps.on('close', () => {
      resolve()
    })
    void ps.on('error', reject)

    // On Windows with Node 21+, there's a bug where attempting to kill a child process
    // results in an EPERM error. Ignore the error in that case.
    // See: https://github.com/nodejs/node/issues/51766
    // We also avoid force-killing the process in this case.
    try {
      const killed = ps.kill('SIGTERM');
      if (!killed && (platform() !== 'win32' || !satisfies(process.version, '>=21'))) {
        setTimeout(() => {
          ps.kill('SIGKILL');
        }, SERVER_KILL_TIMEOUT);
      }
    } catch {
      // no-op
    }
  })
}

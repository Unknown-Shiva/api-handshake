import type { DiagnosticCheck } from '../core/types.js';

export function checkVersion(actual: string, expected?: string): DiagnosticCheck {
  if (expected === undefined) return { status: 'skipped', message: 'No expected API version was configured.' };
  return actual === expected
    ? { status: 'passed', message: 'The API version matches.', details: { matches: true } }
    : { status: 'failed', message: 'The server API version does not match the client expectation.', details: { matches: false } };
}

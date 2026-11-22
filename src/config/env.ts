import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';

export type TestEnv = 'public' | 'stub';

/**
 * Loads `.env.local` (personal secrets, git-ignored), then `.env.<TEST_ENV>` (committed, no secrets).
 * Real values already in `process.env` (CI secrets) win, but an EMPTY value counts as missing:
 * CI systems export unset secrets as '' and must not block the defaults.
 * TEST_ENV=stub always uses the stub's fake credentials, even when real secrets are present.
 */
export const loadEnvironment = (): TestEnv => {
  const name = (process.env.TEST_ENV ?? 'public') as TestEnv;
  const files = name === 'stub' ? ['.env.stub', '.env.local'] : ['.env.local', `.env.${name}`];
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const [key, value] of Object.entries(dotenv.parse(readFileSync(file)))) {
      const current = process.env[key];
      if (current === undefined || current === '' || (name === 'stub' && file === '.env.stub')) {
        process.env[key] = value;
      }
    }
  }
  return name;
};

/** Reads a required variable, failing fast with an actionable message. */
export const env = (key: string): string => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing env var ${key}. Add it to .env.local or your CI secrets (see .env.example).`);
  }
  return value;
};

/** Unique id for this run: set once in playwright.config.ts and inherited by every worker. */
export const runId = (): string => env('RUN_ID');

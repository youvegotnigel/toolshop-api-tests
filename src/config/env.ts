import dotenv from 'dotenv';

export type TestEnv = 'public' | 'stub';

/**
 * Loads `.env.local` (personal secrets, git-ignored) and then `.env.<TEST_ENV>` (committed, no secrets).
 * Values already in `process.env` (CI secrets) always win because dotenv never overrides.
 */
export const loadEnvironment = (): TestEnv => {
  const name = (process.env.TEST_ENV ?? 'public') as TestEnv;
  dotenv.config({ path: ['.env.local', `.env.${name}`], quiet: true });
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

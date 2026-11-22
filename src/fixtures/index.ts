/**
 * The ONE import every spec uses:
 *   import { test, expect } from '../../src/fixtures';
 * ESLint blocks importing '@playwright/test' directly inside tests/.
 */
export { test } from './data.fixtures';
export { expect } from '@playwright/test';
export type { Cleanup } from './data.fixtures';

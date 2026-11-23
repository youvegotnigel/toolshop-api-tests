import { faker } from '@faker-js/faker';
import { runId } from '../config/env';

/** Every record this framework creates carries the run id, so the teardown sweep can find leftovers. */
export const testDataTag = (): string => `qa-${runId()}`;

/**
 * A word that search endpoints can find. Toolshop searches names with MySQL BOOLEAN MODE full-text,
 * where `-` means "exclude", so searching for the run tag itself silently matches nothing.
 * Server-side search results are also cached per query for an hour: a fresh word is always a cache miss.
 */
export const searchToken = (): string => `qa${faker.string.alpha({ length: 10, casing: 'lower' })}`;

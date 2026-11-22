import type { APIRequestContext } from '@playwright/test';

/**
 * Clients describe endpoints only. They never assert, so the same client serves
 * happy paths and negative tests. Specs and fixtures own every assertion.
 */
export abstract class BaseClient {
  constructor(protected readonly request: APIRequestContext) {}
}

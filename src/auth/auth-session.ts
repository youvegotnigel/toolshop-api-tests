import type { APIRequestContext } from '@playwright/test';
import { AuthClient } from '../clients/auth.client';
import { TokenSchema, type Credentials, type Role } from '../schemas/auth.schema';
import { logger } from '../utils/logger';

/** Refresh this long before expiry, so a token never dies mid-test. */
const REFRESH_MARGIN_MS = 60_000;
const LOCKED = 423;

/**
 * One logged-in identity per worker. Toolshop JWTs live about 5 minutes,
 * so the token is renewed automatically before it expires.
 * The login context is worker-scoped: passwords never appear in per-test traces.
 */
export class AuthSession {
  private token: string | undefined;
  private expiresAt = 0;

  constructor(
    private readonly request: APIRequestContext,
    private readonly role: Role,
    private readonly credentials: Credentials,
  ) {}

  async bearer(): Promise<string> {
    if (this.token === undefined || Date.now() > this.expiresAt - REFRESH_MARGIN_MS) {
      await this.login();
    }
    return `Bearer ${String(this.token)}`;
  }

  private async login(): Promise<void> {
    const res = await new AuthClient(this.request).login(this.credentials);
    if (res.status() === LOCKED) {
      throw new Error(
        `Login as ${this.role} failed with HTTP 423: the account is locked after too many failed logins ` +
          '(on the public API usually by other users). This is an environment problem, not a test failure.',
      );
    }
    if (!res.ok()) {
      // Never retry: Toolshop locks non-admin accounts after repeated failed logins.
      throw new Error(`Login as ${this.role} failed with HTTP ${String(res.status())}. Check credentials.`);
    }
    const token = TokenSchema.parse(await res.json());
    this.token = token.access_token;
    this.expiresAt = Date.now() + token.expires_in * 1_000;
    logger.info(`Logged in as ${this.role} (token valid ${String(token.expires_in)}s)`);
  }
}

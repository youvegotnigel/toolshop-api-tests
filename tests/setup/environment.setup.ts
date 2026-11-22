import { test, expect } from '../../src/fixtures';
import { logger } from '../../src/utils/logger';

test('record which Toolshop build is under test', async ({ api }) => {
  await test.step('Read the API status and version', async () => {
    const res = await api.get('/status');
    await expect(res).toBeOK();
    const status = (await res.json()) as { version?: string; environment?: string };
    test.info().annotations.push({ type: 'api-version', description: status.version ?? 'unknown' });
    logger.info(`Toolshop API ${status.version ?? 'unknown'} (${status.environment ?? 'unknown'})`);
  });
});

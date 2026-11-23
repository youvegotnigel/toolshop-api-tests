import { test, expect } from '../../src/fixtures';
import { ImageListSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /images', { tag: ['@products', '@get'] }, () => {
  test('the product photo library lists images with credits', async ({ imagesClient }) => {
    await test.step('Open the product photo library', async () => {
      const res = await imagesClient.list();

      expect(res.status()).toBe(HTTP.OK);
      const images = ImageListSchema.parse(await res.json());
      expect(images.length).toBeGreaterThan(0);
      expect(new Set(images.map((image) => image.id)).size).toBe(images.length);
    });
  });
});

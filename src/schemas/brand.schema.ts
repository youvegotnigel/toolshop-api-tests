import { z } from 'zod';
import { SlugSchema } from './common.schema';

export const BrandSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  slug: SlugSchema,
});

export const BrandListSchema = z.array(BrandSchema);

export type Brand = z.infer<typeof BrandSchema>;
export type BrandInput = Omit<Brand, 'id'>;

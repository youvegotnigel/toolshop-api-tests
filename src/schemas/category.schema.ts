import { z } from 'zod';
import { SlugSchema } from './common.schema';

export const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  slug: SlugSchema,
  parent_id: z.string().nullable(),
});

export type Category = z.infer<typeof CategorySchema>;

/** Tree, search and GET /categories/tree/{id} embed every level of children. */
export type CategoryNode = Category & { sub_categories: CategoryNode[] };

export const CategoryNodeSchema: z.ZodType<CategoryNode> = CategorySchema.extend({
  sub_categories: z.array(z.lazy(() => CategoryNodeSchema)),
});

export const CategoryListSchema = z.array(CategorySchema);
export const CategoryTreeSchema = z.array(CategoryNodeSchema);

export type CategoryInput = { name: string; slug: string; parent_id?: string | null };

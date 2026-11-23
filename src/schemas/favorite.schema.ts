import { z } from 'zod';

export const FavoriteSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  product_id: z.string().min(1),
});

/** GET /favorites embeds the product. */
export const FavoriteListSchema = z.array(
  FavoriteSchema.extend({ product: z.object({ id: z.string(), name: z.string(), price: z.number() }) }),
);

export type Favorite = z.infer<typeof FavoriteSchema>;

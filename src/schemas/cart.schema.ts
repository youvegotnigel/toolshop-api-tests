import { z } from 'zod';

export const CartIdSchema = z.object({ id: z.string().min(1) });

/** POST /carts/{id} and PUT .../quantity answer with this message, not the cart. */
export const CartResultSchema = z.object({ result: z.literal('item added or updated') });

export const CartItemSchema = z.object({
  id: z.string().min(1),
  product_id: z.string().min(1),
  quantity: z.number().int().positive(),
  discount_percentage: z.number().nullable(),
  /** Only present when a location discount applies. */
  discounted_price: z.number().optional(),
  product: z.object({ id: z.string(), name: z.string(), price: z.number() }),
});

export const CartSchema = z.object({
  id: z.string().min(1),
  additional_discount_percentage: z.number().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  cart_items: z.array(CartItemSchema),
});

export type Cart = z.infer<typeof CartSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type CartLine = { product_id: string; quantity: number };

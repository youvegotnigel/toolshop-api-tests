import { z } from 'zod';

/** Toolshop slugs: ASCII letters, digits, dashes and underscores, max 120 chars. */
const slug = z
  .string()
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/, 'slug must be alpha_dash ASCII');

export const BrandSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  slug,
});

export const BrandListSchema = z.array(BrandSchema);

/** PUT and PATCH respond with this, not with the updated brand. */
export const UpdateResultSchema = z.object({ success: z.literal(true) });

export const MessageSchema = z.object({ message: z.string() });

/** 409 and 422 bodies: field name -> list of messages (Laravel MessageBag). */
export const ValidationErrorsSchema = z.record(z.string(), z.array(z.string()).min(1));

export type Brand = z.infer<typeof BrandSchema>;
export type BrandInput = Omit<Brand, 'id'>;
export type UpdateResult = z.infer<typeof UpdateResultSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type ValidationErrors = z.infer<typeof ValidationErrorsSchema>;

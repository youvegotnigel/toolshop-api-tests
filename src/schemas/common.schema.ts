import { z } from 'zod';

/** Toolshop slugs: ASCII letters, digits, dashes and underscores, max 120 chars. */
export const SlugSchema = z
  .string()
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/, 'slug must be alpha_dash ASCII');

/** PUT and PATCH respond with this, not with the updated record. */
export const UpdateResultSchema = z.object({ success: z.literal(true) });

export const MessageSchema = z.object({ message: z.string() });

/** 409 and 422 bodies: field name -> list of messages (Laravel MessageBag). */
export const ValidationErrorsSchema = z.record(z.string(), z.array(z.string()).min(1));

export type UpdateResult = z.infer<typeof UpdateResultSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type ValidationErrors = z.infer<typeof ValidationErrorsSchema>;

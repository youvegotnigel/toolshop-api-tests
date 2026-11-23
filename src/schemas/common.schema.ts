import { z } from 'zod';

/**
 * Slugs in responses. POST/PATCH only accept alpha_dash ASCII, but that is an input rule, not an
 * output guarantee: the public seed data already holds `"storage solutions"` (with a space).
 * The input rule is proven by the 422 tests; builders always generate valid slugs.
 */
export const SlugSchema = z.string().min(1).max(120);

/** PUT and PATCH respond with this, not with the updated record. */
export const UpdateResultSchema = z.object({ success: z.literal(true) });

export const MessageSchema = z.object({ message: z.string() });

/** 409 and 422 bodies: field name -> list of messages (Laravel MessageBag). */
export const ValidationErrorsSchema = z.record(z.string(), z.array(z.string()).min(1));

/**
 * Laravel's default 422 shape. Endpoints that validate inline (product specs) answer with this,
 * not the flat field map above: the API has two validation error formats.
 */
export const LaravelValidationErrorSchema = z.object({
  message: z.string(),
  errors: ValidationErrorsSchema,
});

export type UpdateResult = z.infer<typeof UpdateResultSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type ValidationErrors = z.infer<typeof ValidationErrorsSchema>;

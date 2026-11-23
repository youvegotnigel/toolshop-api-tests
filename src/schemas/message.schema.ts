import { z } from 'zod';

export const MESSAGE_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED'] as const;

export const MessageRecordSchema = z.object({
  id: z.string().min(1),
  subject: z.string(),
  message: z.string(),
  status: z.enum(MESSAGE_STATUSES),
  user_id: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export const ReplySchema = z.object({
  id: z.string().min(1),
  message: z.string(),
  user_id: z.string().min(1),
});

/** GET /messages/{id}: the message with its replies. */
export const MessageDetailSchema = MessageRecordSchema.extend({ replies: z.array(ReplySchema) });

export const MessagePageSchema = z.object({
  current_page: z.number().int().positive(),
  data: z.array(MessageRecordSchema),
  total: z.number().int().nonnegative(),
});

export const AttachErrorsSchema = z.object({ errors: z.array(z.string()).min(1) });

export type MessageRecord = z.infer<typeof MessageRecordSchema>;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
export type ContactInput = { name?: string; email?: string; subject: string; message: string };

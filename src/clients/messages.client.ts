import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import { NO_CACHE } from '../utils/http';
import type { Message, UpdateResult, ValidationErrors } from '../schemas/common.schema';
import type { ContactInput, MessageRecord } from '../schemas/message.schema';

type Page<T> = { current_page: number; data: T[]; total: number };

/**
 * Toolshop /messages (the contact form). Sending and attaching are public; everything else needs a login.
 * There is no DELETE: messages stay until the hourly database reset.
 */
export class MessagesClient extends BaseClient {
  private readonly path = '/messages';

  send(
    contact: ContactInput | Record<string, unknown>,
  ): Promise<APIResponse<MessageRecord | ValidationErrors>> {
    return this.request.post<MessageRecord | ValidationErrors>(this.path, { data: contact });
  }

  /** The API only accepts empty .txt files (multipart field `file`). */
  attach(
    id: string,
    file: { name: string; content: string },
  ): Promise<APIResponse<UpdateResult | { errors: string[] }>> {
    return this.request.post<UpdateResult | { errors: string[] }>(`${this.path}/${id}/attach-file`, {
      multipart: { file: { name: file.name, mimeType: 'text/plain', buffer: Buffer.from(file.content) } },
    });
  }

  list(): Promise<APIResponse<Page<MessageRecord> | Message>> {
    return this.request.get<Page<MessageRecord> | Message>(this.path, { headers: NO_CACHE });
  }

  get(id: string): Promise<APIResponse<MessageRecord>> {
    return this.request.get<MessageRecord>(`${this.path}/${id}`, { headers: NO_CACHE });
  }

  reply(id: string, message: string): Promise<APIResponse<{ id: string; message: string }>> {
    return this.request.post<{ id: string; message: string }>(`${this.path}/${id}/reply`, {
      data: { message },
    });
  }

  setStatus(id: string, status: string): Promise<APIResponse<UpdateResult | Message>> {
    return this.request.put<UpdateResult | Message>(`${this.path}/${id}/status`, { data: { status } });
  }
}

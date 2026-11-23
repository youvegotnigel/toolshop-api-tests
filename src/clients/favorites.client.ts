import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import { NO_CACHE } from '../utils/http';
import type { Message, ValidationErrors } from '../schemas/common.schema';
import type { Favorite } from '../schemas/favorite.schema';

/** Toolshop /favorites: every call needs a login; list and delete only see the caller's own favorites. */
export class FavoritesClient extends BaseClient {
  private readonly path = '/favorites';

  add(productId: string): Promise<APIResponse<Favorite | ValidationErrors>> {
    return this.request.post<Favorite | ValidationErrors>(this.path, { data: { product_id: productId } });
  }

  list(): Promise<APIResponse<Favorite[] | Message>> {
    return this.request.get<Favorite[] | Message>(this.path, { headers: NO_CACHE });
  }

  get(id: string): Promise<APIResponse<Favorite | Message>> {
    return this.request.get<Favorite | Message>(`${this.path}/${id}`, { headers: NO_CACHE });
  }

  /** Answers 204 even when nothing was deleted (someone else's favorite). */
  remove(id: string): Promise<APIResponse<null>> {
    return this.request.delete(`${this.path}/${id}`);
  }
}

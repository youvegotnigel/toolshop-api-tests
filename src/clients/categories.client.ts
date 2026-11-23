import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import { NO_CACHE } from '../utils/http';
import type { Category, CategoryInput, CategoryNode } from '../schemas/category.schema';
import type { Message, UpdateResult, ValidationErrors } from '../schemas/common.schema';

/** Toolshop /categories: everything is public except DELETE, which needs an admin token. */
export class CategoriesClient extends BaseClient {
  private readonly path = '/categories';

  list(): Promise<APIResponse<Category[]>> {
    return this.request.get<Category[]>(this.path, { headers: NO_CACHE });
  }

  /** Top-level categories with every level of children; optionally only the one with this slug. */
  tree(bySlug?: string): Promise<APIResponse<CategoryNode[]>> {
    const params = bySlug === undefined ? undefined : { by_category_slug: bySlug };
    return this.request.get<CategoryNode[]>(`${this.path}/tree`, { params, headers: NO_CACHE });
  }

  /** The API has no GET /categories/{id}; a single category is read through the tree route. */
  getById(id: string): Promise<APIResponse<CategoryNode>> {
    return this.request.get<CategoryNode>(`${this.path}/tree/${id}`, { headers: NO_CACHE });
  }

  search(query: string): Promise<APIResponse<CategoryNode[]>> {
    return this.request.get<CategoryNode[]>(`${this.path}/search`, {
      params: { q: query },
      headers: NO_CACHE,
    });
  }

  create(category: CategoryInput): Promise<APIResponse<Category>> {
    return this.request.post<Category>(this.path, { data: category });
  }

  /** Negative tests only: sends any body, valid or not. */
  createRaw(body: unknown): Promise<APIResponse<ValidationErrors>> {
    return this.request.post<ValidationErrors>(this.path, { data: body });
  }

  replace(id: string, category: CategoryInput): Promise<APIResponse<UpdateResult>> {
    return this.request.put<UpdateResult>(`${this.path}/${id}`, { data: category });
  }

  update(id: string, changes: Partial<CategoryInput>): Promise<APIResponse<UpdateResult | ValidationErrors>> {
    return this.request.patch<UpdateResult | ValidationErrors>(`${this.path}/${id}`, { data: changes });
  }

  remove(id: string): Promise<APIResponse<Message | null>> {
    return this.request.delete(`${this.path}/${id}`);
  }
}

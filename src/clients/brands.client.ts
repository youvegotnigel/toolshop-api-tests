import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import { NO_CACHE } from '../utils/http';
import type { Brand, BrandInput, Message, UpdateResult } from '../schemas/brand.schema';

/** Toolshop /brands: GET, POST, PUT and PATCH are public; DELETE needs an admin token. */
export class BrandsClient extends BaseClient {
  private readonly path = '/brands';

  list(): Promise<APIResponse<Brand[]>> {
    return this.request.get<Brand[]>(this.path, { headers: NO_CACHE });
  }

  search(query: string): Promise<APIResponse<Brand[]>> {
    return this.request.get<Brand[]>(`${this.path}/search`, { params: { q: query }, headers: NO_CACHE });
  }

  getById(id: string): Promise<APIResponse<Brand>> {
    return this.request.get<Brand>(`${this.path}/${id}`, { headers: NO_CACHE });
  }

  create(brand: BrandInput): Promise<APIResponse<Brand>> {
    return this.request.post<Brand>(this.path, { data: brand });
  }

  /** Negative tests only: sends any body, valid or not. */
  createRaw(body: unknown): Promise<APIResponse<Record<string, string[]>>> {
    return this.request.post<Record<string, string[]>>(this.path, { data: body });
  }

  replace(id: string, brand: BrandInput): Promise<APIResponse<UpdateResult>> {
    return this.request.put<UpdateResult>(`${this.path}/${id}`, { data: brand });
  }

  update(id: string, changes: Partial<BrandInput>): Promise<APIResponse<UpdateResult>> {
    return this.request.patch<UpdateResult>(`${this.path}/${id}`, { data: changes });
  }

  remove(id: string): Promise<APIResponse<Message | null>> {
    return this.request.delete(`${this.path}/${id}`);
  }
}

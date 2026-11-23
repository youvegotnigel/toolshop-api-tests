import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import { NO_CACHE } from '../utils/http';
import type { Message, UpdateResult, ValidationErrors } from '../schemas/common.schema';
import type {
  Image,
  Product,
  ProductFilters,
  ProductInput,
  ProductPage,
  ProductSpec,
  ProductSpecInput,
  SpecName,
} from '../schemas/product.schema';

const query = (filters: ProductFilters): Record<string, string | number> =>
  Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [key, typeof value === 'boolean' ? Number(value) : value]),
  );

/**
 * Toolshop /products and their specs. Products: everything is public except DELETE (admin).
 * Specs: reads are public, writes need any login.
 */
export class ProductsClient extends BaseClient {
  private readonly path = '/products';

  list(filters: ProductFilters = {}): Promise<APIResponse<ProductPage>> {
    return this.request.get<ProductPage>(this.path, { params: query(filters), headers: NO_CACHE });
  }

  search(q: string): Promise<APIResponse<ProductPage>> {
    return this.request.get<ProductPage>(`${this.path}/search`, { params: { q }, headers: NO_CACHE });
  }

  getById(id: string): Promise<APIResponse<Product>> {
    return this.request.get<Product>(`${this.path}/${id}`, { headers: NO_CACHE });
  }

  /** Up to 10 other products in the same category. */
  related(id: string): Promise<APIResponse<Product[]>> {
    return this.request.get<Product[]>(`${this.path}/${id}/related`, { headers: NO_CACHE });
  }

  create(product: ProductInput): Promise<APIResponse<Product>> {
    return this.request.post<Product>(this.path, { data: product });
  }

  /** Negative tests only: sends any body, valid or not. */
  createRaw(body: unknown): Promise<APIResponse<ValidationErrors>> {
    return this.request.post<ValidationErrors>(this.path, { data: body });
  }

  replace(id: string, product: ProductInput): Promise<APIResponse<UpdateResult>> {
    return this.request.put<UpdateResult>(`${this.path}/${id}`, { data: product });
  }

  update(
    id: string,
    changes: Record<string, unknown>,
  ): Promise<APIResponse<UpdateResult | ValidationErrors>> {
    return this.request.patch<UpdateResult | ValidationErrors>(`${this.path}/${id}`, { data: changes });
  }

  remove(id: string): Promise<APIResponse<Message | null>> {
    return this.request.delete(`${this.path}/${id}`);
  }

  specs(productId: string): Promise<APIResponse<ProductSpec[]>> {
    return this.request.get<ProductSpec[]>(`${this.path}/${productId}/specs`, { headers: NO_CACHE });
  }

  spec(productId: string, specId: string): Promise<APIResponse<ProductSpec>> {
    return this.request.get<ProductSpec>(`${this.path}/${productId}/specs/${specId}`, { headers: NO_CACHE });
  }

  addSpec(productId: string, spec: ProductSpecInput): Promise<APIResponse<ProductSpec>> {
    return this.request.post<ProductSpec>(`${this.path}/${productId}/specs`, { data: spec });
  }

  updateSpec(
    productId: string,
    specId: string,
    changes: Partial<ProductSpecInput>,
  ): Promise<APIResponse<UpdateResult>> {
    return this.request.put<UpdateResult>(`${this.path}/${productId}/specs/${specId}`, { data: changes });
  }

  removeSpec(productId: string, specId: string): Promise<APIResponse<null>> {
    return this.request.delete(`${this.path}/${productId}/specs/${specId}`);
  }

  specNames(): Promise<APIResponse<SpecName[]>> {
    return this.request.get<SpecName[]>('/product-specs/names', { headers: NO_CACHE });
  }
}

/** Toolshop /images: the product photos (public, read-only reference data). */
export class ImagesClient extends BaseClient {
  list(): Promise<APIResponse<Image[]>> {
    return this.request.get<Image[]>('/images');
  }
}

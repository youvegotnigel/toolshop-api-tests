import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import { NO_CACHE } from '../utils/http';
import type { Message } from '../schemas/common.schema';
import type { Cart, CartLine } from '../schemas/cart.schema';

type CartResult = { result: string };

/** Toolshop /carts: anonymous, anyone holding the cart id can read and change it. */
export class CartsClient extends BaseClient {
  private readonly path = '/carts';

  create(): Promise<APIResponse<{ id: string }>> {
    return this.request.post<{ id: string }>(this.path, { data: {} });
  }

  /** Adds the quantity to the line for this product (creating it when needed). */
  addItem(
    cartId: string,
    line: CartLine | Record<string, unknown>,
  ): Promise<APIResponse<CartResult | Message>> {
    return this.request.post<CartResult | Message>(`${this.path}/${cartId}`, { data: line });
  }

  get(cartId: string): Promise<APIResponse<Cart | Message>> {
    return this.request.get<Cart | Message>(`${this.path}/${cartId}`, { headers: NO_CACHE });
  }

  /** Sets the quantity of an existing line. */
  setQuantity(cartId: string, line: CartLine): Promise<APIResponse<CartResult | Message>> {
    return this.request.put<CartResult | Message>(`${this.path}/${cartId}/product/quantity`, { data: line });
  }

  removeItem(cartId: string, productId: string): Promise<APIResponse<Message | null>> {
    return this.request.delete(`${this.path}/${cartId}/product/${productId}`);
  }

  remove(cartId: string): Promise<APIResponse<Message | null>> {
    return this.request.delete(`${this.path}/${cartId}`);
  }
}

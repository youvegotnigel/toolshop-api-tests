import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import { NO_CACHE } from '../utils/http';
import type { Message, UpdateResult, ValidationErrors } from '../schemas/common.schema';
import type { Token } from '../schemas/auth.schema';
import type {
  ApiError,
  RegisteredUser,
  User,
  UserPage,
  UserProfile,
  UserRegistration,
} from '../schemas/user.schema';

/**
 * Toolshop /users. Register and login are public; me, logout, refresh, get, PUT and PATCH need a login
 * (customers only for themselves); the list and DELETE need an admin.
 * Never add forgot-password or change-password here (AGENTS.md safety rules).
 */
export class UsersClient extends BaseClient {
  register(user: UserRegistration): Promise<APIResponse<RegisteredUser>> {
    return this.request.post<RegisteredUser>('/users/register', { data: user });
  }

  /** Negative tests only: sends any body, valid or not. */
  registerRaw(body: unknown): Promise<APIResponse<ValidationErrors>> {
    return this.request.post<ValidationErrors>('/users/register', { data: body });
  }

  me(): Promise<APIResponse<User | Message>> {
    return this.request.get<User | Message>('/users/me', { headers: NO_CACHE });
  }

  /** Invalidates the token this client was created with. */
  logout(): Promise<APIResponse<Message>> {
    return this.request.get<Message>('/users/logout');
  }

  /** JWT refresh for the token this client was created with. Not the forbidden database `/refresh`. */
  refreshToken(): Promise<APIResponse<Token>> {
    return this.request.get<Token>('/users/refresh');
  }

  list(page = 1): Promise<APIResponse<UserPage | Message>> {
    return this.request.get<UserPage | Message>('/users', { params: { page }, headers: NO_CACHE });
  }

  search(query: string): Promise<APIResponse<UserPage>> {
    return this.request.get<UserPage>('/users/search', { params: { q: query }, headers: NO_CACHE });
  }

  getById(id: string): Promise<APIResponse<User | ApiError>> {
    return this.request.get<User | ApiError>(`/users/${id}`, { headers: NO_CACHE });
  }

  replace(id: string, profile: UserProfile): Promise<APIResponse<UpdateResult | ApiError>> {
    return this.request.put<UpdateResult | ApiError>(`/users/${id}`, { data: profile });
  }

  update(id: string, changes: Partial<UserProfile>): Promise<APIResponse<UpdateResult | ValidationErrors>> {
    return this.request.patch<UpdateResult | ValidationErrors>(`/users/${id}`, { data: changes });
  }

  remove(id: string): Promise<APIResponse<Message | null>> {
    return this.request.delete(`/users/${id}`);
  }
}

import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import type { RegisteredUser, UserRegistration } from '../schemas/user.schema';

/** Toolshop /users: register is public; search and delete need an admin token. */
export class UsersClient extends BaseClient {
  register(user: UserRegistration): Promise<APIResponse<RegisteredUser>> {
    return this.request.post<RegisteredUser>('/users/register', { data: user });
  }

  search(query: string): Promise<APIResponse<{ data: RegisteredUser[] }>> {
    return this.request.get<{ data: RegisteredUser[] }>('/users/search', { params: { q: query } });
  }

  remove(id: string): Promise<APIResponse<null>> {
    return this.request.delete(`/users/${id}`);
  }
}

import { z } from 'zod';

/** Response of POST /users/register: only the fields that were sent come back. */
export const RegisteredUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  first_name: z.string(),
  last_name: z.string(),
});

export const AddressSchema = z.object({
  street: z.string().nullable(),
  house_number: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  postal_code: z.string().nullable(),
});

/** A stored customer as /users/me, /users/{id}, /users and /users/search return it. */
export const UserSchema = RegisteredUserSchema.extend({
  phone: z.string().nullable(),
  dob: z.string().nullable(),
  address: AddressSchema,
});

/** GET /users and GET /users/search are Laravel paginators, not the arrays the spec documents. */
export const UserPageSchema = z.object({
  current_page: z.number().int().positive(),
  data: z.array(UserSchema),
  total: z.number().int().nonnegative(),
});

export const ErrorSchema = z.object({ error: z.string() });

export type RegisteredUser = z.infer<typeof RegisteredUserSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserPage = z.infer<typeof UserPageSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type ApiError = z.infer<typeof ErrorSchema>;

export type UserRegistration = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  dob: string;
};

/** Body of PUT /users/{id}: street, city and country are required; the password is never changed. */
export type UserProfile = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  dob: string;
  address: Address;
};

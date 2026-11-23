import { z } from 'zod';

export const ImageSchema = z.object({
  id: z.string().min(1),
  title: z.string().nullable(),
  file_name: z.string().nullable(),
  by_name: z.string().nullable(),
  by_url: z.string().nullable(),
  source_name: z.string().nullable(),
  source_url: z.string().nullable(),
});

export const ImageListSchema = z.array(ImageSchema);

export const ProductSpecSchema = z.object({
  id: z.string().min(1),
  product_id: z.string().min(1),
  spec_name: z.string().min(1).max(100),
  spec_value: z.string().max(255),
  spec_unit: z.string().max(30).nullable(),
});

export const ProductSpecListSchema = z.array(ProductSpecSchema);

/** GET /product-specs/names: every spec name in use, with its distinct values. */
export const SpecNameListSchema = z.array(
  z.object({ name: z.string(), values: z.array(z.string()), unit: z.string().nullable() }),
);

/** Products embed their brand, category and image; the *_id fields are hidden in responses. */
export const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().nullable(),
  price: z.number().nonnegative(),
  is_location_offer: z.boolean(),
  is_rental: z.boolean(),
  /** Role-dependent: a boolean for shoppers and customers, the stock count (or null) for admins. */
  in_stock: z.union([z.boolean(), z.number().int().nonnegative(), z.null()]),
  brand: z.object({ id: z.string(), name: z.string() }),
  category: z.object({ id: z.string(), name: z.string() }),
  product_image: ImageSchema,
});

/** GET /products and GET /products/search are paginated, 9 per page. */
export const ProductPageSchema = z.object({
  current_page: z.number().int().positive(),
  data: z.array(ProductSchema),
  total: z.number().int().nonnegative(),
});

export type Image = z.infer<typeof ImageSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductPage = z.infer<typeof ProductPageSchema>;
export type ProductSpec = z.infer<typeof ProductSpecSchema>;
export type SpecName = z.infer<typeof SpecNameListSchema>[number];

export type ProductInput = {
  name: string;
  description: string;
  price: number;
  brand_id: string;
  category_id: string;
  product_image_id: string;
  is_location_offer: boolean;
  is_rental: boolean;
};

export type ProductSpecInput = { spec_name: string; spec_value: string; spec_unit: string | null };

export type ProductFilters = {
  by_category_slug?: string;
  by_brand?: string;
  is_rental?: boolean;
  page?: number;
};

import { buildBrand } from './brand.builder';

export type InvalidBrandCase = {
  /** Business-language reason, used in the test title. */
  reason: string;
  /** The field the API must reject. */
  field: 'name' | 'slug';
  body: Record<string, unknown>;
};

/**
 * Bodies POST /brands must reject with 422. Built from a valid brand so every case still
 * carries the run tag: if the API ever accepts one, the teardown sweep removes it.
 */
export const invalidBrands = (): InvalidBrandCase[] => {
  const valid = buildBrand();
  return [
    { reason: 'the name is missing', field: 'name', body: { slug: valid.slug } },
    { reason: 'the slug is missing', field: 'slug', body: { name: valid.name } },
    {
      reason: 'the slug contains spaces',
      field: 'slug',
      body: { ...valid, slug: `${valid.slug} with spaces` },
    },
    {
      reason: 'the name is longer than 120 characters',
      field: 'name',
      body: { ...valid, name: `${valid.name} ${'x'.repeat(120)}` },
    },
  ];
};

// In-memory records shared by the stub's resource modules (they reference each other).
export const brands = new Map();
export const categories = new Map();
export const products = new Map();
export const specs = new Map();
export const carts = new Map();
export const invoices = new Map();
export const favorites = new Map();
export const messages = new Map();
export const images = new Map(
  [
    ['01STUBIMAGE000000000000001', 'Hammer'],
    ['01STUBIMAGE000000000000002', 'Pliers'],
  ].map(([id, title]) => [
    id,
    {
      id,
      title,
      file_name: `${title.toLowerCase()}.avif`,
      by_name: 'Stub',
      by_url: null,
      source_name: 'Stub',
      source_url: null,
    },
  ]),
);

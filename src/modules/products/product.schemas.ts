import { z } from "zod";

const skuSchema = z
  .string()
  .trim()
  .min(1, "SKU is required")
  .max(64, "SKU must not exceed 64 characters")
  .transform((sku) => sku.toUpperCase())
  .pipe(
    z
      .string()
      .regex(
        /^[A-Z0-9][A-Z0-9._-]*$/,
        "SKU must contain only letters, numbers, dots, underscores, or hyphens",
      ),
  );

const moneySchema = z
  .string()
  .regex(
    /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/,
    "Price must be a non-negative decimal with at most 2 decimal places",
  );

export const createProductSchema = z
  .object({
    sku: skuSchema,

    name: z
      .string()
      .trim()
      .min(1, "Product name is required")
      .max(200, "Product name must not exceed 200 characters"),

    currentPrice: moneySchema,

    currencyCode: z
      .string()
      .trim()
      .length(3, "Currency code must contain exactly 3 characters")
      .transform((currencyCode) => currencyCode.toUpperCase())
      .pipe(z.string().regex(/^[A-Z]{3}$/))
      .default("INR"),
  })
  .strict();

export const productIdParamSchema = z.object({
  id: z.string().uuid("Product ID must be a valid UUID"),
});

export const listProductsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    search: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export type CreateProductInput = z.output<typeof createProductSchema>;

export type ListProductsQuery = z.output<
  typeof listProductsQuerySchema
>;
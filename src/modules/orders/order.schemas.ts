
import { z } from "zod";

export const createOrderSchema = z
  .object({
    customerId: z
      .string()
      .trim()
      .min(1, "Customer ID is required")
      .max(128, "Customer ID must not exceed 128 characters"),

    items: z
      .array(
        z
          .object({
            productId: z.string().uuid("Product ID must be a valid UUID"),
            quantity: z
              .number()
              .int("Quantity must be an integer")
              .min(1, "Quantity must be at least 1")
              .max(2_147_483_647, "Quantity exceeds the supported limit"),
          })
          .strict(),
      )
      .min(1, "An order must contain at least one item")
      .max(100, "An order cannot contain more than 100 items"),
  })
  .strict()
  .superRefine((order, context) => {
    const productIds = new Set<string>();

    order.items.forEach((item, index) => {
      if (productIds.has(item.productId)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "productId"],
          message: "A product can appear only once in an order",
        });
      }

      productIds.add(item.productId);
    });
  });

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(1, "Idempotency-Key header is required")
  .max(128, "Idempotency-Key must not exceed 128 characters")
  .regex(
    /^[A-Za-z0-9._:-]+$/,
    "Idempotency-Key contains unsupported characters",
  );

export const orderIdParamSchema = z.object({
  id: z.string().uuid("Order ID must be a valid UUID"),
});

export type CreateOrderInput = z.output<typeof createOrderSchema>;

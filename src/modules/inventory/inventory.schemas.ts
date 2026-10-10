import { z } from "zod";

export const productIdParamSchema = z.object({
  id: z.string().uuid("Product ID must be a valid UUID"),
});

export const initializeInventorySchema = z
  .object({
    onHandQuantity: z
      .number()
      .int("On-hand quantity must be an integer")
      .min(0, "On-hand quantity cannot be negative")
      .max(2_147_483_647, "On-hand quantity exceeds the supported limit"),
  })
  .strict();

export type InitializeInventoryInput = z.output<
  typeof initializeInventorySchema
>;
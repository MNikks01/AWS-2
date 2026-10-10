
import { Prisma } from "@prisma/client";
import { AppError } from "../../shared/errors/app-error.js";
import { inventoryRepository } from "./inventory.repository.js";
import type { InitializeInventoryInput } from "./inventory.schemas.js";

function toInventoryResponse(inventory: {
  productId: string;
  onHandQuantity: number;
  reservedQuantity: number;
  updatedAt: Date;
}) {
  return {
    productId: inventory.productId,
    onHandQuantity: inventory.onHandQuantity,
    reservedQuantity: inventory.reservedQuantity,
    availableQuantity:
      inventory.onHandQuantity - inventory.reservedQuantity,
    updatedAt: inventory.updatedAt,
  };
}

export const inventoryService = {
  async initialize(
    productId: string,
    input: InitializeInventoryInput,
  ) {
    const product =
      await inventoryRepository.findProductWithInventory(productId);

    if (!product) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    if (product.inventory) {
      throw new AppError(
        "INVENTORY_ALREADY_INITIALIZED",
        "Inventory has already been initialized for this product",
        409,
      );
    }

    try {
      const inventory = await inventoryRepository.create(
        productId,
        input.onHandQuantity,
      );

      return toInventoryResponse(inventory);
    } catch (error) {
      // Another request might initialize inventory after our read
      // but before our INSERT. The primary key protects against this race.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "INVENTORY_ALREADY_INITIALIZED",
          "Inventory has already been initialized for this product",
          409,
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new AppError("PRODUCT_NOT_FOUND", "Product not found", 404);
      }

      throw error;
    }
  },

  async getByProductId(productId: string) {
    const product =
      await inventoryRepository.findProductWithInventory(productId);

    if (!product) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    if (!product.inventory) {
      throw new AppError(
        "INVENTORY_NOT_INITIALIZED",
        "Inventory has not been initialized for this product",
        404,
      );
    }

    return toInventoryResponse(product.inventory);
  },
};
import { prisma } from "../../db/prisma.js";

export const inventoryRepository = {
  findProductWithInventory(productId: string) {
    return prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        inventory: {
          select: {
            productId: true,
            onHandQuantity: true,
            reservedQuantity: true,
            updatedAt: true,
          },
        },
      },
    });
  },

  create(productId: string, onHandQuantity: number) {
    return prisma.inventory.create({
      data: {
        productId,
        onHandQuantity,
        reservedQuantity: 0,
      },
      select: {
        productId: true,
        onHandQuantity: true,
        reservedQuantity: true,
        updatedAt: true,
      },
    });
  },
};
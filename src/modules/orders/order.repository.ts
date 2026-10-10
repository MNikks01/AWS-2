
import { Prisma } from "@prisma/client";

import { prisma } from "../../db/prisma.js";

export const orderRepository = {
  findByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ) {
    return prisma.order.findUnique({
      where: {
        customerId_idempotencyKey: {
          customerId,
          idempotencyKey,
        },
      },
      include: {
        items: true,
      },
    });
  },

  findActiveProducts(productIds: string[]) {
    return prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        isActive: true,
      },
      select: {
        id: true,
        currentPrice: true,
        currencyCode: true,
      },
    });
  },

  create(data: {
    customerId: string;
    idempotencyKey: string;
    requestHash: string;
    totalAmount: Prisma.Decimal;
    currencyCode: string;
    items: {
      productId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
    }[];
  }) {
    return prisma.order.create({
      data: {
        customerId: data.customerId,
        idempotencyKey: data.idempotencyKey,
        requestHash: data.requestHash,
        totalAmount: data.totalAmount,
        currencyCode: data.currencyCode,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  },
};

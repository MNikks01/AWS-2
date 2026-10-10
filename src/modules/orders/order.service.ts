
import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import { AppError } from "../../shared/errors/app-error.js";
import { orderRepository } from "./order.repository.js";
import type { CreateOrderInput } from "./order.schemas.js";

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: true;
  };
}>;

function toOrderResponse(order: OrderWithItems) {
  return {
    id: order.id,
    customerId: order.customerId,
    status: order.status,
    totalAmount: order.totalAmount.toFixed(2),
    currencyCode: order.currencyCode.trim(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
    })),
    failureCode: order.failureCode,
    failureMessage: order.failureMessage,
    completedAt: order.completedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function calculateRequestHash(input: CreateOrderInput): string {
  const normalizedRequest = {
    customerId: input.customerId,
    items: [...input.items]
      .sort((a, b) => a.productId.localeCompare(b.productId))
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
  };

  return createHash("sha256")
    .update(JSON.stringify(normalizedRequest))
    .digest("hex");
}

function idempotencyConflict(): AppError {
  return new AppError(
    "IDEMPOTENCY_KEY_REUSED",
    "This idempotency key has already been used with a different request",
    409,
  );
}

function toExistingOrder(
  order: OrderWithItems,
  requestHash: string,
) {
  if (order.requestHash !== requestHash) {
    throw idempotencyConflict();
  }

  return toOrderResponse(order);
}

export const orderService = {
  async create(input: CreateOrderInput, idempotencyKey: string) {
    const requestHash = calculateRequestHash(input);

    const existingOrder = await orderRepository.findByIdempotencyKey(
      input.customerId,
      idempotencyKey,
    );

    if (existingOrder) {
      return toExistingOrder(existingOrder, requestHash);
    }

    const productIds = input.items.map((item) => item.productId);
    const products = await orderRepository.findActiveProducts(productIds);

    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );

    for (const item of input.items) {
      if (!productsById.has(item.productId)) {
        throw new AppError(
          "ORDER_PRODUCT_UNAVAILABLE",
          `Product ${item.productId} does not exist or is inactive`,
          422,
        );
      }
    }

    const currencies = new Set(
      products.map((product) => product.currencyCode.trim()),
    );

    if (currencies.size !== 1) {
      throw new AppError(
        "MIXED_CURRENCY_ORDER_NOT_SUPPORTED",
        "All products in an order must use the same currency",
        422,
      );
    }

    const currencyCode = [...currencies][0];

    if (!currencyCode) {
      throw new AppError(
        "ORDER_CURRENCY_UNAVAILABLE",
        "Unable to determine the order currency",
        500,
      );
    }

    let totalAmount = new Prisma.Decimal(0);

    const items = input.items.map((item) => {
      const product = productsById.get(item.productId);

      if (!product) {
        throw new AppError(
          "ORDER_PRODUCT_UNAVAILABLE",
          `Product ${item.productId} does not exist or is inactive`,
          422,
        );
      }

      const unitPrice = product.currentPrice;

      totalAmount = totalAmount.plus(
        unitPrice.mul(item.quantity),
      );

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
      };
    });

    try {
      const order = await orderRepository.create({
        customerId: input.customerId,
        idempotencyKey,
        requestHash,
        totalAmount,
        currencyCode,
        items,
      });

      return toOrderResponse(order);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const concurrentOrder =
          await orderRepository.findByIdempotencyKey(
            input.customerId,
            idempotencyKey,
          );

        if (concurrentOrder) {
          return toExistingOrder(concurrentOrder, requestHash);
        }
      }

      throw error;
    }
  },
};

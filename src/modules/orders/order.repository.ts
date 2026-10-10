
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

    async processPendingOrder(orderId: string, leaseExpiresAt: Date) {
        return prisma.$transaction(async (tx) => {
            // Lock the order so concurrent requests cannot process it twice.
            const lockedOrders = await tx.$queryRaw<Array<{ id: string }>>(
                Prisma.sql`
          SELECT "id"
          FROM "Order"
          WHERE "id" = ${orderId}
          FOR UPDATE
        `,
            );

            if (lockedOrders.length === 0) {
                return { kind: "NOT_FOUND" as const };
            }

            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { items: true },
            });

            if (!order) {
                return { kind: "NOT_FOUND" as const };
            }

            // Never reserve inventory twice for an already processed order.
            if (order.status !== "PENDING") {
                return { kind: "UNCHANGED" as const, order };
            }

            const productIds = order.items.map((item) => item.productId);

            // Lock inventory rows in a consistent order to reduce deadlocks.
            const inventoryRows = await tx.$queryRaw<
                Array<{
                    productId: string;
                    onHandQuantity: number;
                    reservedQuantity: number;
                }>
            >(
                Prisma.sql`
          SELECT "productId", "onHandQuantity", "reservedQuantity"
          FROM "Inventory"
          WHERE "productId" IN (${Prisma.join(productIds)})
          ORDER BY "productId"
          FOR UPDATE
        `,
            );

            const inventoryByProductId = new Map(
                inventoryRows.map((inventory) => [
                    inventory.productId,
                    inventory,
                ]),
            );

            // Check every item before changing any inventory.
            const canReserveAllItems = order.items.every((item) => {
                const inventory = inventoryByProductId.get(item.productId);

                return (
                    inventory !== undefined &&
                    inventory.onHandQuantity - inventory.reservedQuantity >=
                    item.quantity
                );
            });

            if (!canReserveAllItems) {
                const failedOrder = await tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: "FAILED",
                        failureCode: "INSUFFICIENT_STOCK",
                        failureMessage:
                            "Insufficient inventory for one or more products",
                        processingAttemptCount: { increment: 1 },
                        processingLeaseExpiresAt: null,
                    },
                    include: { items: true },
                });

                return { kind: "PROCESSED" as const, order: failedOrder };
            }

            // All inventory rows are locked and all quantities are available.
            // Any failure below rolls back every change in this transaction.
            for (const item of order.items) {
                await tx.inventory.update({
                    where: { productId: item.productId },
                    data: {
                        reservedQuantity: { increment: item.quantity },
                    },
                });

                await tx.inventoryReservation.create({
                    data: {
                        orderId,
                        productId: item.productId,
                        quantity: item.quantity,
                        status: "ACTIVE",
                    },
                });
            }

            const processingOrder = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: "PROCESSING",
                    processingAttemptCount: { increment: 1 },
                    processingLeaseExpiresAt: leaseExpiresAt,
                    failureCode: null,
                    failureMessage: null,
                },
                include: { items: true },
            });

            return { kind: "PROCESSED" as const, order: processingOrder };
        });
    },
};

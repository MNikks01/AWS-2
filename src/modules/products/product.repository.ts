import { Prisma } from "@prisma/client";

import { prisma } from "../../db/prisma.js";
import type {
  CreateProductInput,
  ListProductsQuery,
} from "./product.schemas.js";

export const productRepository = {
  create(data: CreateProductInput) {
    return prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        currentPrice: new Prisma.Decimal(data.currentPrice),
        currencyCode: data.currencyCode,
      },
    });
  },

  findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
    });
  },

  async findMany(query: ListProductsQuery) {
    const where: Prisma.ProductWhereInput = query.search
      ? {
          OR: [
            {
              sku: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              name: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {};

    const skip = (query.page - 1) * query.limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: query.limit,
      }),

      prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
    };
  },
};
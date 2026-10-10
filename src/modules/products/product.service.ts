import { Prisma } from "@prisma/client";

import { AppError } from "../../shared/errors/app-error.js";
import { productRepository } from "./product.repository.js";
import type {
  CreateProductInput,
  ListProductsQuery,
} from "./product.schemas.js";

function toProductResponse(product: {
  id: string;
  sku: string;
  name: string;
  currentPrice: Prisma.Decimal;
  currencyCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    currentPrice: product.currentPrice.toFixed(2),
    currencyCode: product.currencyCode.trim(),
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export const productService = {
  async create(input: CreateProductInput) {
    try {
      const product = await productRepository.create(input);

      return toProductResponse(product);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "PRODUCT_SKU_ALREADY_EXISTS",
          "A product with this SKU already exists",
          409,
        );
      }

      throw error;
    }
  },

  async getById(id: string) {
    const product = await productRepository.findById(id);

    if (!product) {
      throw new AppError(
        "PRODUCT_NOT_FOUND",
        "Product not found",
        404,
      );
    }

    return toProductResponse(product);
  },

  async list(query: ListProductsQuery) {
    const result = await productRepository.findMany(query);

    return {
      data: result.products.map(toProductResponse),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
      },
    };
  },
};
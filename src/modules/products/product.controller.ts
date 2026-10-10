import type { RequestHandler } from "express";
import { z } from "zod";

import { AppError } from "../../shared/errors/app-error.js";
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
} from "./product.schemas.js";
import { productService } from "./product.service.js";

function validationError(error: z.ZodError): AppError {
  const message = error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "request";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

  return new AppError("VALIDATION_ERROR", message, 400);
}

export const createProduct: RequestHandler = async (req, res) => {
  const parsed = createProductSchema.safeParse(req.body);

  if (!parsed.success) {
    throw validationError(parsed.error);
  }

  const product = await productService.create(parsed.data);

  res.status(201).json({
    data: product,
  });
};

export const getProductById: RequestHandler = async (req, res) => {
  const parsed = productIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    throw validationError(parsed.error);
  }

  const product = await productService.getById(parsed.data.id);

  res.status(200).json({
    data: product,
  });
};

export const listProducts: RequestHandler = async (req, res) => {
  const parsed = listProductsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw validationError(parsed.error);
  }

  const result = await productService.list(parsed.data);

  res.status(200).json(result);
};
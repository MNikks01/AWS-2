import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../../shared/errors/app-error.js";
import {
  initializeInventorySchema,
  productIdParamSchema,
} from "./inventory.schemas.js";
import { inventoryService } from "./inventory.service.js";

function validationError(error: z.ZodError): AppError {
  const message = error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "request";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

  return new AppError("VALIDATION_ERROR", message, 400);
}

export const initializeInventory: RequestHandler = async (req, res) => {
  const params = productIdParamSchema.safeParse(req.params);
  if (!params.success) throw validationError(params.error);

  const body = initializeInventorySchema.safeParse(req.body);
  if (!body.success) throw validationError(body.error);

  const inventory = await inventoryService.initialize(
    params.data.id,
    body.data,
  );

  res.status(201).json({ data: inventory });
};

export const getInventory: RequestHandler = async (req, res) => {
  const params = productIdParamSchema.safeParse(req.params);
  if (!params.success) throw validationError(params.error);

  const inventory = await inventoryService.getByProductId(params.data.id);

  res.status(200).json({ data: inventory });
};
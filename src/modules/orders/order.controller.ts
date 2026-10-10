
import type { RequestHandler } from "express";
import { z } from "zod";

import { AppError } from "../../shared/errors/app-error.js";
import {
  createOrderSchema,
  idempotencyKeySchema,
} from "./order.schemas.js";
import { orderService } from "./order.service.js";

function validationError(error: z.ZodError): AppError {
  const message = error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "request";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

  return new AppError("VALIDATION_ERROR", message, 400);
}

export const createOrder: RequestHandler = async (req, res) => {
  const body = createOrderSchema.safeParse(req.body);

  if (!body.success) {
    throw validationError(body.error);
  }

  const key = idempotencyKeySchema.safeParse(
    req.headers["idempotency-key"],
  );

  if (!key.success) {
    throw validationError(key.error);
  }

  const order = await orderService.create(body.data, key.data);

  res.status(201).json({
    data: order,
  });
};

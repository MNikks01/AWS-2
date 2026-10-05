import type { RequestHandler } from "express";

import { AppError } from "../shared/errors/app-error.js";

export const notFoundHandler: RequestHandler = (req) => {
  throw new AppError(
    "ROUTE_NOT_FOUND",
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
  );
};
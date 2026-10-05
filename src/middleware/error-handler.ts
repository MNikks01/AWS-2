import type { ErrorRequestHandler } from "express";

import { logger } from "../shared/logging/logger.js";
import { AppError } from "../shared/errors/app-error.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  if (error instanceof AppError) {
    logger.warn(
      {
        err: error,
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
      },
      "Application error",
    );

    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        requestId: req.id,
      },
    });

    return;
  }

  logger.error(
    {
      err: error,
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
    },
    "Unhandled error",
  );

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      requestId: req.id,
    },
  });
};
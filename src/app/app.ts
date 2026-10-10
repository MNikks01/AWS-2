import crypto from "node:crypto";

import express, { type Express } from "express";
import { pinoHttp } from "pino-http";
import { healthRouter } from "../routes/health.routes.js";
import { logger } from "../shared/logging/logger.js";
import { notFoundHandler } from "../middleware/not-found.js";
import { errorHandler } from "../middleware/error-handler.js";
import { productRouter } from "../modules/products/product.routes.js";
import { inventoryRouter } from "../modules/inventory/inventory.routes.js";
import { orderRouter } from "../modules/orders/order.routes.js";

export const createApp = (): Express => {
  const app = express();

  app.disable("x-powered-by");

  app.use(express.json());

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => {
        const requestId = req.headers["x-request-id"];

        return typeof requestId === "string"
          ? requestId
          : crypto.randomUUID();
      },
    }),
  );

  app.use(healthRouter);

  app.use("/api/v1/products", productRouter);
  app.use("/api/v1/products", inventoryRouter);
  app.use("/api/v1/orders", orderRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
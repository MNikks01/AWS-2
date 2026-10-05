import { createApp } from "./app/app.js";
import { config } from "./config/config.js";
import { logger } from "./shared/logging/logger.js";

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      environment: config.env,
    },
    "HTTP server started",
  );
});

const shutdown = (signal: string) => {
  logger.info({ signal }, "Shutdown signal received");

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
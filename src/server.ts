import { createApp } from "./app/app.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "./db/prisma.js";
import { config } from "./config/config.js";
import { logger } from "./shared/logging/logger.js";

const app = createApp();

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    const server = app.listen(config.port, () => {
      logger.info(
        {
          port: config.port,
        },
        "Server started",
      );
    });

    let isShuttingDown = false;

    const shutdown = async (signal: string): Promise<void> => {

      if (isShuttingDown) {
        return;
      }

      isShuttingDown = true;

      logger.info({ signal }, "Shutdown signal received");

      server.close(async () => {
        try {
          await disconnectDatabase();

          logger.info("Database connection closed");
          logger.info("Server shut down successfully");

          process.exit(0);
        } catch (error) {
          logger.error(
            { error },
            "Error during shutdown",
          );

          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });
  } catch (error) {
    logger.error(
      { error },
      "Failed to start server",
    );

    await disconnectDatabase().catch(() => undefined);

    process.exit(1);
  }
}

void startServer();
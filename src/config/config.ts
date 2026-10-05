import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3000),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
  console.error("Invalid environment configuration:");
  console.error(parsedConfig.error.flatten().fieldErrors);

  process.exit(1);
}

export const config = {
  env: parsedConfig.data.NODE_ENV,
  port: parsedConfig.data.PORT,
  logLevel: parsedConfig.data.LOG_LEVEL,
} as const;
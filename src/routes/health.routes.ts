import { Router } from "express";
import { prisma } from "../db/prisma.js";

const router: Router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

router.get("/ready", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;

  res.status(200).json({
    status: "ok",
    database: "ok",
  });
});

export { router as healthRouter };
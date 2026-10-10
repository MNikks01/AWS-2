
import { Router, type Router as ExpressRouter } from "express";

import { createOrder, processOrder } from "./order.controller.js";

const router: ExpressRouter = Router();

router.post("/", createOrder);
router.post("/:id/process", processOrder);

export { router as orderRouter };

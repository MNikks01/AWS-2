
import { Router, type Router as ExpressRouter } from "express";

import { createOrder } from "./order.controller.js";

const router: ExpressRouter = Router();

router.post("/", createOrder);

export { router as orderRouter };

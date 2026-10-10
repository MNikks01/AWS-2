import { Router, type Router as ExpressRouter } from "express";

import {
  createProduct,
  getProductById,
  listProducts,
} from "./product.controller.js";

const router: ExpressRouter = Router();

router.post("/", createProduct);
router.get("/", listProducts);
router.get("/:id", getProductById);

export { router as productRouter };
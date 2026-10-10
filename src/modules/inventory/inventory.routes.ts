import { Router, type Router as ExpressRouter } from "express";
import {
  getInventory,
  initializeInventory,
} from "./inventory.controller.js";

const router: ExpressRouter = Router();

router.put("/:id/inventory", initializeInventory);
router.get("/:id/inventory", getInventory);

export { router as inventoryRouter };
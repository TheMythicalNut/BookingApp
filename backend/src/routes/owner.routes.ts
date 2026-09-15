import { Router } from "express";
import * as controller from "../controllers/owner.controller.js";
import { validateBody, validateParams } from "../middlewares/zod.middleware.js";
import { GetOwnerByIdSchema, GetOwnersByIdsSchema, GetOwnersByOptionsSchema } from "../config/route.zod.schemas.js";

const router = Router();

router.post("/", validateBody(GetOwnersByOptionsSchema), controller.getOwnersByOptions);
router.post("/ids", validateParams(GetOwnersByIdsSchema), controller.getOwnersByIds);
router.get("/id/:id", validateParams(GetOwnerByIdSchema), controller.getOwnerById);

export default router;
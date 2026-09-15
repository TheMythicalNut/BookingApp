import { Router } from "express";
import * as controller from "../controllers/packages.controller.js";
import { validateBody, validateParams } from "../middlewares/zod.middleware.js";
import { GetPackageByIdSchema, GetPackageByLinkSchema, GetPackagesByIdsSchema, GetPackagesByOptionsSchema } from "../config/route.zod.schemas.js";

const router = Router();

router.post("/", validateBody(GetPackagesByOptionsSchema), controller.getPackagesByOptions);
router.post("/ids", validateBody(GetPackagesByIdsSchema), controller.getPackagesByIds);
router.get("/id/:id", validateParams(GetPackageByIdSchema), controller.getPackageById);
router.get("/link/:link", validateParams(GetPackageByLinkSchema), controller.getPackageByLink);

export default router;
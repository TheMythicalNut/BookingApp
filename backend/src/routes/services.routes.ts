import { Router } from "express";
import * as controller from "../controllers/services.controller.js";
import { validateBody, validateParams } from "../middlewares/zod.middleware.js";
import { GetServiceByIdSchema, GetServiceByLinkSchema, GetServicesByIdsSchema, GetServicesByOptionsSchema } from "../config/route.zod.schemas.js";

const router = Router();

router.post("/", validateBody(GetServicesByOptionsSchema), controller.getServicesByOptions);
router.post("/ids", validateBody(GetServicesByIdsSchema), controller.getServicesByIds);
router.get("/id/:id", validateParams(GetServiceByIdSchema), controller.getServicesById);
router.get("/link/:link", validateParams(GetServiceByLinkSchema), controller.getServicesByLink);

export default router;
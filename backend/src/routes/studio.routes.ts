import { Router } from "express";
import * as controller from "../controllers/studio.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { upload, validateFileBytes } from "../middlewares/upload.middleware.js";
import { uploadStudioMedia } from "../controllers/media.controller.js";
import { validateBody, validateParams } from "../middlewares/zod.middleware.js";
import { GetStudioByIdSchema, GetStudioByLinkSchema, GetStudiosByIdsSchema, GetStudiosByOptionsSchema, GetStudiosByOwnersSchema } from "../config/route.zod.schemas.js";

const router = Router();

router.post("/", validateBody(GetStudiosByOptionsSchema), controller.getStudiosByOptions);
router.post("/ids", validateBody(GetStudiosByIdsSchema), controller.getStudiosByIds);
router.post("/owners", validateBody(GetStudiosByOwnersSchema), controller.getStudioByOwners);
router.get("/id/:id", validateParams(GetStudioByIdSchema), controller.getStudioById);
router.get("/link/:link", validateParams(GetStudioByLinkSchema), controller.getStudioByLink);

router.post('/media/upload',
    authenticate,
    upload.fields([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'heroImage_0', maxCount: 1 },
        { name: 'heroImage_1', maxCount: 1 },
        { name: 'heroImage_2', maxCount: 1 },
    ]),
    validateFileBytes,
    uploadStudioMedia
)

export default router;
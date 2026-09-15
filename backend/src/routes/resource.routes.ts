import { Router } from "express";
import { upload, validateFileBytes } from "../middlewares/upload.middleware.js";
import { authenticate } from '../middlewares/auth.middleware.js';
import { authenticateReservation } from "../middlewares/resauth.middleware.js";

import { updateMany, updateResource } from '../controllers/resource.controller.js';
import { createReservation, updateReservation } from "../controllers/reservation.controller.js";

const router = Router();

router.post('/studios/update',      authenticate, updateResource('studio'));
router.post('/owners/update',       authenticate, updateResource('owner'));
router.post('/packages/update',     authenticate, updateResource('package'));
router.post('/services/update',     authenticate, updateResource('service'));

router.post('/categories/update-many', authenticate, updateMany('categories')); 
router.post('/exceptions/update-many', authenticate, updateMany('exceptions'));
router.post('/schedules/update-many', authenticate, updateMany('schedules'));
router.post('/packages/update-many', authenticate, updateMany('packages'));
router.post('/services/update-many', authenticate, upload.any(), validateFileBytes, updateMany('services'));
router.post('/discounts/update-many', authenticate, updateMany('discounts'));


router.post("/reservations/create", createReservation);
router.post("/reservations/update/:id", authenticateReservation, updateReservation);


export default router;
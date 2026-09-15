import { Router } from "express";
import { getReservationsByIds, getReservationsByOptions, getStudioReservationsById, getUserReservationById, resendEmailById } from "../controllers/reservation.controller.js";
import { authenticate, verifyAdmin } from "../middlewares/auth.middleware.js";
import { authenticateReservation } from "../middlewares/resauth.middleware.js";

const router = Router();

router.post("/", verifyAdmin, getReservationsByOptions);
router.post("/ids/", authenticate, getReservationsByIds);
router.get("/studio", authenticate, getStudioReservationsById);
router.get("/id/:id", authenticateReservation, getUserReservationById);
router.get("/resend/:id", authenticateReservation, resendEmailById);

export default router;
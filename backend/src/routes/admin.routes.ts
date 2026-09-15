import { Router } from "express";
import * as acontroller from "../controllers/auth.controller.js";
import * as lcontroller from "../controllers/login.controller.js";
import * as controller from "../controllers/admin.controller.js";
import { verifyAdmin } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../config/redis-limiter.js";

const router = Router();

router.post("/login", authLimiter, lcontroller.loginAdmin);

router.get("/authvalidate", authLimiter, acontroller.verifyAdminAuth);

router.post("/request", verifyAdmin, controller.request);

export default router;
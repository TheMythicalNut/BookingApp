import { Router } from "express";
import * as controller from "../controllers/user.controller.js";

const router = Router();

router.get("/", controller.getUsers);

export default router;
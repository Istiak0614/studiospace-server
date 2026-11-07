import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { getDashboardStats } from "./dashboard.controller.js";

const router = Router();

router.get("/stats", verifyToken, getDashboardStats);

export default router;
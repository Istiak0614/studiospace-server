import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { createBooking } from "./booking.controller.js";

const router = Router();

router.use(verifyToken); 

router.post("/", createBooking);

export default router;
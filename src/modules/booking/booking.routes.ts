import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { cancelBooking, createBooking, getMyBookings } from "./booking.controller.js";

const router = Router();

router.use(verifyToken);

router.post("/", createBooking);
router.get("/mine", getMyBookings);
router.patch("/:id/cancel", cancelBooking);

export default router;
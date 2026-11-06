import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import {
  cancelBooking,
  createBooking,
  getBookingRequests,
  getMyBookings,
  updateBookingStatus,
} from "./booking.controller.js";

const router = Router();

router.use(verifyToken);

router.post("/", createBooking);
router.get("/mine", getMyBookings);
router.get("/requests", getBookingRequests);
router.patch("/:id/cancel", cancelBooking);
router.patch("/:id/status", updateBookingStatus);

export default router;
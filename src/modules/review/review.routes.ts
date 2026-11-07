import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { createReview, getMyReviewedBookingIds } from "./review.controller.js";

const router = Router();

router.post("/", verifyToken, createReview);
router.get("/mine", verifyToken, getMyReviewedBookingIds);

export default router;
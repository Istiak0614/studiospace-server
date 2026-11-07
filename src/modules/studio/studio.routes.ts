import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import {
  createStudio,
  deleteStudio,
  getFeaturedStudios,
  getMyStudios,
  getStudioById,
  getStudios,
  updateStudio,
} from "./studio.controller.js";
import { getBookedSlots } from "../booking/booking.controller.js";
import { getStudioReviews } from "../review/review.controller.js";

const router = Router();

router.get("/", getStudios);
router.get("/featured", getFeaturedStudios);
router.get("/:id/reviews", getStudioReviews);

router.get("/mine", verifyToken, getMyStudios); 
router.post("/", verifyToken, createStudio);
router.patch("/:id", verifyToken, updateStudio);
router.delete("/:id", verifyToken, deleteStudio);

router.get("/:id/booked-slots", getBookedSlots);
router.get("/:id", getStudioById);


export default router;
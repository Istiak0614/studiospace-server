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

const router = Router();

router.get("/", getStudios);
router.get("/featured", getFeaturedStudios);

router.get("/mine", verifyToken, getMyStudios); 
router.post("/", verifyToken, createStudio);
router.patch("/:id", verifyToken, updateStudio);
router.delete("/:id", verifyToken, deleteStudio);

router.get("/:id", getStudioById);

export default router;
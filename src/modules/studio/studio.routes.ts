import { Router } from "express";
import { getFeaturedStudios, getStudioById, getStudios } from "./studio.controller.js";

const router = Router();

router.get("/", getStudios);
router.get("/featured", getFeaturedStudios); 
router.get("/:id", getStudioById);

export default router;
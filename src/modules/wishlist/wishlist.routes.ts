import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { getWishlist, getWishlistIds, toggleWishlist } from "./wishlist.controller.js";

const router = Router();

router.use(verifyToken);

router.get("/", getWishlist);
router.get("/ids", getWishlistIds);
router.post("/:studioId", toggleWishlist);

export default router;
import type { RequestHandler } from "express";
import { studios, wishlists } from "../../config/db.js";
import type { Studio } from "../../types/studio.js";
import { toObjectId } from "../../utils/objectId.js";

export const getWishlist: RequestHandler = async (req, res) => {
  const saved = await wishlists
    .aggregate<Studio>([
      { $match: { userEmail: req.user!.email } },
      { $sort: { createdAt: -1 } },
      { $lookup: { from: "studios", localField: "studioId", foreignField: "_id", as: "studio" } },
      { $unwind: "$studio" },          // also drops studios that were deleted
      { $replaceRoot: { newRoot: "$studio" } },
    ])
    .toArray();
  res.json(saved);
};

export const getWishlistIds: RequestHandler = async (req, res) => {
  const list = await wishlists.find({ userEmail: req.user!.email }, { projection: { _id: 0, studioId: 1 } }).toArray();
  res.json(list.map((w) => w.studioId));
};

export const toggleWishlist: RequestHandler<{ studioId: string }> = async (req, res) => {
  const studioId = toObjectId(req.params.studioId);
  if (!studioId) {
    res.status(400).json({ message: "Invalid studio id" });
    return;
  }

  const userEmail = req.user!.email;
  const removed = await wishlists.deleteOne({ userEmail, studioId });
  if (removed.deletedCount > 0) {
    res.json({ saved: false, message: "Removed from your wishlist" });
    return;
  }

  if (!(await studios.findOne({ _id: studioId }, { projection: { _id: 1 } }))) {
    res.status(404).json({ message: "Studio not found" });
    return;
  }

  await wishlists.insertOne({ userEmail, studioId, createdAt: new Date() });
  res.status(201).json({ saved: true, message: "Saved to your wishlist" });
};
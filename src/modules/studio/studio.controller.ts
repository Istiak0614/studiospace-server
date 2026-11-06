import type { RequestHandler } from "express";
import { studios } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";

export const getStudios: RequestHandler = async (_req, res) => {
  const list = await studios.find().sort({ createdAt: -1 }).toArray();
  res.json({
    studios: list,
    pagination: { page: 1, totalPages: 1, total: list.length },
  });
};

export const getFeaturedStudios: RequestHandler = async (_req, res) => {
  const featured = await studios
    .find()
    .sort({ rating: -1, reviewCount: -1, createdAt: -1 })
    .limit(6)
    .toArray();
  res.json(featured);
};

export const getStudioById: RequestHandler<{ id: string }> = async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid studio id" });
    return;
  }

  const studio = await studios.findOne({ _id });
  if (!studio) {
    res.status(404).json({ message: "Studio not found" });
    return;
  }

  res.json(studio);
};
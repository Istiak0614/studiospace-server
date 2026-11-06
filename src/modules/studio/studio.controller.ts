import type { RequestHandler } from "express";
import type { WithId } from "mongodb";
import { db, studios } from "../../config/db.js";
import type { Studio } from "../../types/studio.js";
import { toObjectId } from "../../utils/objectId.js";
import { validateStudioInput } from "./studio.validation.js";

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


type OwnedResult = { studio: WithId<Studio> } | { status: number; message: string };

async function findOwnedStudio(id: string, email: string): Promise<OwnedResult> {
  const _id = toObjectId(id);
  if (!_id) return { status: 400, message: "Invalid studio id" };

  const studio = await studios.findOne({ _id });
  if (!studio) return { status: 404, message: "Studio not found" };
  if (studio.ownerEmail !== email) return { status: 403, message: "You can only manage your own studios" };

  return { studio };
}

export const getMyStudios: RequestHandler = async (req, res) => {
  const list = await studios.find({ ownerEmail: req.user!.email }).sort({ createdAt: -1 }).toArray();
  res.json(list);
};

export const createStudio: RequestHandler = async (req, res) => {
  const { data, errors } = validateStudioInput(req.body ?? {});
  if (!data) {
    res.status(400).json({ message: errors[0], errors });
    return;
  }

  const user = req.user!;
  const profile = await db.collection("user").findOne({ email: user.email }, { projection: { image: 1 } });

  const now = new Date();
  const studio: Studio = {
    ...data,
    ownerEmail: user.email,   
    ownerName: user.name,
    ...(profile?.image && { ownerPhoto: profile.image as string }),
    rating: 0,
    reviewCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await studios.insertOne(studio);
  res.status(201).json({ message: "Studio published successfully", studio: { ...studio, _id: result.insertedId } });
};

export const updateStudio: RequestHandler<{ id: string }> = async (req, res) => {
  const owned = await findOwnedStudio(req.params.id, req.user!.email);
  if (!("studio" in owned)) {
    res.status(owned.status).json({ message: owned.message });
    return;
  }

  const { data, errors } = validateStudioInput(req.body ?? {});
  if (!data) {
    res.status(400).json({ message: errors[0], errors });
    return;
  }

  const updated = await studios.findOneAndUpdate(
    { _id: owned.studio._id },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  res.json({ message: "Studio updated successfully", studio: updated });
};

export const deleteStudio: RequestHandler<{ id: string }> = async (req, res) => {
  const owned = await findOwnedStudio(req.params.id, req.user!.email);
  if (!("studio" in owned)) {
    res.status(owned.status).json({ message: owned.message });
    return;
  }

  await studios.deleteOne({ _id: owned.studio._id });
  res.json({ message: "Studio deleted successfully" });
};
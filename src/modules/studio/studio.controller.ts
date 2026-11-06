import type { Filter, Sort } from "mongodb";
import { CATEGORIES, type StudioCategory } from "../../types/studio.js";
import { escapeRegex } from "../../utils/escapeRegex.js";
import type { RequestHandler } from "express";
import type { WithId } from "mongodb";
import { db, studios } from "../../config/db.js";
import type { Studio } from "../../types/studio.js";
import { toObjectId } from "../../utils/objectId.js";
import { validateStudioInput } from "./studio.validation.js";

const SORT_OPTIONS: Record<string, Sort> = {
  rating: { rating: -1, reviewCount: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
  "price-asc": { hourlyRate: 1, _id: 1 },
  "price-desc": { hourlyRate: -1, _id: 1 },
};

const toNumber = (value: unknown) => {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

export const getStudios: RequestHandler = async (req, res) => {
  const { q, category, minPrice, maxPrice, sort, page, limit } = req.query as Record<string, string | undefined>;

  // Build the MongoDB filter step by step
  const filter: Filter<Studio> = {};

  if (q?.trim()) {
    const pattern = new RegExp(escapeRegex(q.trim()), "i");
    filter.$or = [{ title: pattern }, { location: pattern }];
  }

  if (category && (CATEGORIES as readonly string[]).includes(category)) {
    filter.category = category as StudioCategory;
  }

  const priceFilter: { $gte?: number; $lte?: number } = {};
  const min = toNumber(minPrice);
  const max = toNumber(maxPrice);
  if (min !== undefined) priceFilter.$gte = min;
  if (max !== undefined) priceFilter.$lte = max;
  if (Object.keys(priceFilter).length > 0) filter.hourlyRate = priceFilter;

  const perPage = Math.min(Math.max(Math.floor(toNumber(limit) ?? 12), 1), 24);
  const currentPage = Math.max(Math.floor(toNumber(page) ?? 1), 1);

  const [list, total, bounds] = await Promise.all([
    studios
      .find(filter)
      .sort(SORT_OPTIONS[sort ?? ""] ?? SORT_OPTIONS.rating)
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .toArray(),
    studios.countDocuments(filter),
    studios
      .aggregate<{ min: number; max: number }>([
        { $group: { _id: null, min: { $min: "$hourlyRate" }, max: { $max: "$hourlyRate" } } },
      ])
      .toArray(),
  ]);

  res.json({
    studios: list,
    pagination: {
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    },
    priceRange: { min: bounds[0]?.min ?? 0, max: bounds[0]?.max ?? 0 },
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
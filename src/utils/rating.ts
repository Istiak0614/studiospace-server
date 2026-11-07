import type { ObjectId } from "mongodb";
import { reviews, studios } from "../config/db.js";

export async function recalculateStudioRating(studioId: ObjectId) {
  const [stats] = await reviews
    .aggregate<{ avg: number; count: number }>([
      { $match: { studioId } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ])
    .toArray();

  await studios.updateOne(
    { _id: studioId },
    { $set: { rating: stats ? Math.round(stats.avg * 10) / 10 : 0, reviewCount: stats?.count ?? 0 } }
  );
}
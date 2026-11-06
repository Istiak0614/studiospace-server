import type { ObjectId } from "mongodb";
import { bookings } from "../config/db.js";

export const rangesOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart < bEnd && aEnd > bStart;

export const findConfirmedClash = (studioId: ObjectId, start: Date, end: Date, excludeId?: ObjectId) =>
  bookings.findOne({
    studioId,
    status: "Confirmed",
    startTime: { $lt: end },
    endTime: { $gt: start },
    ...(excludeId && { _id: { $ne: excludeId } }),
  });
import type { ObjectId } from "mongodb";
import { bookings } from "../config/db.js";
export { rangesOverlap } from "./ranges.js";

export const findConfirmedClash = (studioId: ObjectId, start: Date, end: Date, excludeId?: ObjectId) =>
  bookings.findOne({
    studioId,
    status: "Confirmed",
    startTime: { $lt: end },
    endTime: { $gt: start },
    ...(excludeId && { _id: { $ne: excludeId } }),
  });
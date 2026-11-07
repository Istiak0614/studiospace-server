import type { Filter } from "mongodb";
import { bookings } from "../config/db.js";
import type { Booking } from "../types/booking.js";

export async function refreshBookingStatuses(scope: Filter<Booking>) {
  const now = new Date();
  await Promise.all([
    bookings.updateMany(
      { ...scope, status: "Confirmed", endTime: { $lte: now } },
      { $set: { status: "Completed", updatedAt: now } }
    ),
    bookings.updateMany(
      { ...scope, status: "Pending", startTime: { $lte: now } },
      { $set: { status: "Cancelled", cancelledBy: "system", updatedAt: now } }
    ),
  ]);
}
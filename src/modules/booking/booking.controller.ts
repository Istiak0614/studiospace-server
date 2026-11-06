import type { RequestHandler } from "express";
import type { Filter } from "mongodb";
import { bookings, studios } from "../../config/db.js";
import { BOOKING_STATUSES, type Booking, type BookingStatus } from "../../types/booking.js";
import { toObjectId } from "../../utils/objectId.js";
import { findConfirmedClash } from "../../utils/overlap.js";

const HOUR_MS = 60 * 60 * 1000;
const MAX_HOURS = 12;
const ACTIVE_STATUSES: BookingStatus[] = ["Pending", "Confirmed"];

export const createBooking: RequestHandler = async (req, res) => {
  const user = req.user!;
  const { studioId, startTime, endTime } = req.body ?? {};

  const _id = typeof studioId === "string" ? toObjectId(studioId) : null;
  if (!_id) {
    res.status(400).json({ message: "Invalid studio id" });
    return;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    res.status(400).json({ message: "Please choose a valid date and time" });
    return;
  }

  const hours = (end.getTime() - start.getTime()) / HOUR_MS;
  if (!Number.isInteger(hours) || hours < 1 || hours > MAX_HOURS) {
    res.status(400).json({ message: `Bookings must be between 1 and ${MAX_HOURS} whole hours` });
    return;
  }
  if (start.getTime() <= Date.now()) {
    res.status(400).json({ message: "Please choose a time in the future" });
    return;
  }

  const studio = await studios.findOne({ _id });
  if (!studio) {
    res.status(404).json({ message: "Studio not found" });
    return;
  }
  if (studio.ownerEmail === user.email) {
    res.status(403).json({ message: "You can't book your own studio" });
    return;
  }

  const clash = await findConfirmedClash(_id, start, end);
  if (clash) {
    res.status(409).json({
      message: "This time overlaps a confirmed booking. Please choose another slot.",
      conflict: { startTime: clash.startTime, endTime: clash.endTime },
    });
    return;
  }

  const duplicate = await bookings.findOne({
    studioId: _id,
    guestEmail: user.email,
    status: { $in: ACTIVE_STATUSES },
    startTime: { $lt: end },
    endTime: { $gt: start },
  });
  if (duplicate) {
    res.status(409).json({ message: "You already have a request for this time" });
    return;
  }

  const now = new Date();
  const booking: Booking = {
    studioId: _id,
    studioTitle: studio.title,
    studioImage: studio.images[0],
    studioLocation: studio.location,
    hostEmail: studio.ownerEmail,
    hostName: studio.ownerName,
    guestEmail: user.email,
    guestName: user.name,
    startTime: start,
    endTime: end,
    hours,
    hourlyRate: studio.hourlyRate,
    securityDeposit: studio.securityDeposit,
    totalPrice: hours * studio.hourlyRate + studio.securityDeposit,
    status: "Pending", 
    createdAt: now,
    updatedAt: now,
  };

  const result = await bookings.insertOne(booking);
  res.status(201).json({
    message: "Booking request sent! The host will confirm it soon.",
    booking: { ...booking, _id: result.insertedId },
  });
};

export const getBookedSlots: RequestHandler<{ id: string }> = async (req, res) => {
  const _id = toObjectId(req.params.id);
  const from = new Date(String(req.query.from));
  const to = new Date(String(req.query.to));

  if (!_id || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    res.status(400).json({ message: "Provide a valid studio id and from/to range" });
    return;
  }
  if (to.getTime() - from.getTime() > 31 * 24 * HOUR_MS) {
    res.status(400).json({ message: "Range can be at most 31 days" });
    return;
  }

  const slots = await bookings
    .find(
      { studioId: _id, status: "Confirmed", startTime: { $lt: to }, endTime: { $gt: from } },
      { projection: { _id: 0, startTime: 1, endTime: 1 } }
    )
    .sort({ startTime: 1 })
    .toArray();

  res.json(slots);
};
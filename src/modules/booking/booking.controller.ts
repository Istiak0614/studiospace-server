import type { RequestHandler } from "express";
import type { Filter } from "mongodb";
import { bookings, studios } from "../../config/db.js";
import { BOOKING_STATUSES, type Booking, type BookingStatus } from "../../types/booking.js";
import { toObjectId } from "../../utils/objectId.js";
import { findConfirmedClash } from "../../utils/overlap.js";
import { refreshBookingStatuses } from "../../utils/bookingStatus.js";

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

export const getMyBookings: RequestHandler = async (req, res) => {
  const email = req.user!.email;
    await refreshBookingStatuses({ guestEmail: email });
  const list = await bookings.find({ guestEmail: email }).sort({ startTime: -1 }).toArray();
  res.json(list);
};

export const cancelBooking: RequestHandler<{ id: string }> = async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid booking id" });
    return;
  }

  const booking = await bookings.findOne({ _id });
  if (!booking) {
    res.status(404).json({ message: "Booking not found" });
    return;
  }
  if (booking.guestEmail !== req.user!.email) {
    res.status(403).json({ message: "You can only cancel your own bookings" });
    return;
  }
  if (booking.status !== "Pending") {
    res.status(400).json({ message: `Only pending bookings can be cancelled. This one is ${booking.status.toLowerCase()}.` });
    return;
  }

  const updated = await bookings.findOneAndUpdate(
    { _id, status: "Pending" },
    { $set: { status: "Cancelled", cancelledBy: "guest", updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!updated) {
    res.status(409).json({ message: "This booking was just updated. Please refresh." });
    return;
  }

  res.json({ message: "Booking cancelled", booking: updated });
};

export const getBookingRequests: RequestHandler = async (req, res) => {
  const email = req.user!.email;
    await refreshBookingStatuses({ hostEmail: email });
  const { status } = req.query as { status?: string };

  const filter: Filter<Booking> = { hostEmail: email };
  if (status && (BOOKING_STATUSES as readonly string[]).includes(status)) {
    filter.status = status as BookingStatus;
  }

  const list = await bookings.find(filter).sort({ createdAt: -1 }).toArray();
  res.json(list);
};

export const updateBookingStatus: RequestHandler<{ id: string }> = async (req, res) => {
  const { status } = req.body ?? {};
  if (status !== "Confirmed" && status !== "Cancelled") {
    res.status(400).json({ message: "Status must be Confirmed or Cancelled" });
    return;
  }

  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "Invalid booking id" });
    return;
  }

  const booking = await bookings.findOne({ _id });
  if (!booking) {
    res.status(404).json({ message: "Booking not found" });
    return;
  }
  if (booking.hostEmail !== req.user!.email) {
    res.status(403).json({ message: "Only the host can respond to this request" });
    return;
  }
  if (booking.status !== "Pending") {
    res.status(400).json({ message: `This booking is already ${booking.status.toLowerCase()}` });
    return;
  }

  if (status === "Confirmed") {
    if (booking.startTime.getTime() <= Date.now()) {
      res.status(400).json({ message: "This request's start time has already passed" });
      return;
    }
    // Challenge 2 again: re-check at confirm time, so two overlapping
    // requests can never both become Confirmed
    const clash = await findConfirmedClash(booking.studioId, booking.startTime, booking.endTime, booking._id);
    if (clash) {
      res.status(409).json({ message: "Another confirmed booking already covers this time" });
      return;
    }
  }

  const now = new Date();
  const updated = await bookings.findOneAndUpdate(
    { _id, status: "Pending" },
    { $set: { status, updatedAt: now, ...(status === "Cancelled" && { cancelledBy: "host" as const }) } },
    { returnDocument: "after" }
  );
  if (!updated) {
    res.status(409).json({ message: "This request was just updated. Please refresh." });
    return;
  }

  let autoDeclined = 0;
  if (status === "Confirmed") {
    const result = await bookings.updateMany(
      {
        studioId: booking.studioId,
        status: "Pending",
        _id: { $ne: booking._id },
        startTime: { $lt: booking.endTime },
        endTime: { $gt: booking.startTime },
      },
      { $set: { status: "Cancelled", cancelledBy: "system", updatedAt: now } }
    );
    autoDeclined = result.modifiedCount;
  }

  res.json({
    message: status === "Confirmed" ? "Booking confirmed" : "Booking request declined",
    booking: updated,
    autoDeclined,
  });
};
import type { RequestHandler } from "express";
import { bookings, db, reviews } from "../../config/db.js";
import type { Review } from "../../types/review.js";
import { refreshBookingStatuses } from "../../utils/bookingStatus.js";
import { toObjectId } from "../../utils/objectId.js";
import { recalculateStudioRating } from "../../utils/rating.js";


export const createReview: RequestHandler = async (req, res) => {
  const user = req.user!;
  const { bookingId, rating, comment } = req.body ?? {};

  const _id = typeof bookingId === "string" ? toObjectId(bookingId) : null;
  if (!_id) {
    res.status(400).json({ message: "Invalid booking id" });
    return;
  }

  const stars = Number(rating);
  const text = typeof comment === "string" ? comment.trim() : "";
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    res.status(400).json({ message: "Please choose a rating from 1 to 5 stars" });
    return;
  }
  if (text.length < 10 || text.length > 500) {
    res.status(400).json({ message: "Your review must be between 10 and 500 characters" });
    return;
  }

  await refreshBookingStatuses({ _id });
  const booking = await bookings.findOne({ _id });

  if (!booking) {
    res.status(404).json({ message: "Booking not found" });
    return;
  }
  if (booking.guestEmail !== user.email) {
    res.status(403).json({ message: "You can only review your own bookings" });
    return;
  }
  if (booking.status !== "Completed") {
    res.status(400).json({ message: "You can review a studio after your session is completed" });
    return;
  }
  if (await reviews.findOne({ bookingId: _id })) {
    res.status(409).json({ message: "You've already reviewed this booking" });
    return;
  }

  const profile = await db.collection("user").findOne({ email: user.email }, { projection: { image: 1 } });

  const review: Review = {
    studioId: booking.studioId,
    bookingId: _id,
    userEmail: user.email,
    userName: user.name,
    ...(profile?.image && { userPhoto: profile.image as string }),
    rating: stars,
    comment: text,
    createdAt: new Date(),
  };

  const result = await reviews.insertOne(review);
  await recalculateStudioRating(booking.studioId);

  res.status(201).json({ message: "Thanks for your review!", review: { ...review, _id: result.insertedId } });
};

export const getStudioReviews: RequestHandler<{ id: string }> = async (req, res) => {
  const studioId = toObjectId(req.params.id);
  if (!studioId) {
    res.status(400).json({ message: "Invalid studio id" });
    return;
  }
  const list = await reviews.find({ studioId }).sort({ createdAt: -1 }).limit(20).toArray();
  res.json(list);
};

export const getMyReviewedBookingIds: RequestHandler = async (req, res) => {
  const list = await reviews
    .find({ userEmail: req.user!.email }, { projection: { _id: 0, bookingId: 1 } })
    .toArray();
  res.json(list.map((r) => r.bookingId));
};
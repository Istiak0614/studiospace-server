import type { RequestHandler } from "express";
import { bookings, studios, wishlists } from "../../config/db.js";
import type { BookingStatus } from "../../types/booking.js";
import { refreshBookingStatuses } from "../../utils/bookingStatus.js";

const EARNED: BookingStatus[] = ["Confirmed", "Completed"];
const UPCOMING: BookingStatus[] = ["Pending", "Confirmed"];
const MONTHS = 6;

const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

function lastMonthKeys(count: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric" }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

const monthLabel = (key: string) =>
  new Date(`${key}-15T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" });

const earningsExpr = { $sum: { $multiply: ["$hours", "$hourlyRate"] } };

export const getDashboardStats: RequestHandler = async (req, res) => {
  const email = req.user!.email;
  const tzParam = typeof req.query.tz === "string" ? req.query.tz : "UTC";
  const tz = isValidTimeZone(tzParam) ? tzParam : "UTC";

  await Promise.all([refreshBookingStatuses({ hostEmail: email }), refreshBookingStatuses({ guestEmail: email })]);

  const now = new Date();
  const since = new Date(now);
  since.setMonth(since.getMonth() - MONTHS);

  const [listings, bookingsMade, upcomingBookings, pendingRequests, savedStudios, totalAgg, monthlyAgg, recent] =
    await Promise.all([
      studios.countDocuments({ ownerEmail: email }),
      bookings.countDocuments({ guestEmail: email }),
      bookings.countDocuments({ guestEmail: email, status: { $in: UPCOMING }, startTime: { $gt: now } }),
      bookings.countDocuments({ hostEmail: email, status: "Pending" }),
      wishlists.countDocuments({ userEmail: email }),
      bookings
        .aggregate<{ total: number }>([
          { $match: { hostEmail: email, status: { $in: EARNED } } },
          { $group: { _id: null, total: earningsExpr } },
        ])
        .toArray(),
      bookings
        .aggregate<{ _id: string; total: number }>([
          { $match: { hostEmail: email, status: { $in: EARNED }, startTime: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$startTime", timezone: tz } },
              total: earningsExpr,
            },
          },
        ])
        .toArray(),
      bookings
        .find({ $or: [{ hostEmail: email }, { guestEmail: email }] })
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray(),
    ]);

  const byMonth = new Map(monthlyAgg.map((m) => [m._id, m.total]));
  const earningsByMonth = lastMonthKeys(MONTHS, tz).map((key) => ({
    key,
    month: monthLabel(key),
    earnings: byMonth.get(key) ?? 0,
  }));

  res.json({
    stats: {
      listings,
      bookingsMade,
      upcomingBookings,
      pendingRequests,
      savedStudios,
      totalEarnings: totalAgg[0]?.total ?? 0,
    },
    earningsByMonth,
    recentActivity: recent.map((b) => ({ ...b, role: b.hostEmail === email ? "host" : "guest" })),
  });
};
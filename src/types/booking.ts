import type { ObjectId } from "mongodb";

export const BOOKING_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface Booking {
  _id?: ObjectId;
  studioId: ObjectId;
  studioTitle: string;
  studioImage: string;
  studioLocation: string;
  hostEmail: string;
  hostName: string;
  guestEmail: string;
  guestName: string;
  startTime: Date;
  endTime: Date;
  hours: number;
  hourlyRate: number;
  securityDeposit: number;
  totalPrice: number; 
  status: BookingStatus;
  cancelledBy?: "guest" | "host" | "system";
  createdAt: Date;
  updatedAt: Date;
}
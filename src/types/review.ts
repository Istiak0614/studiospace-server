import type { ObjectId } from "mongodb";

export interface Review {
  _id?: ObjectId;
  studioId: ObjectId;
  bookingId: ObjectId; 
  userEmail: string;
  userName: string;
  userPhoto?: string;
  rating: number;     
  comment: string;
  createdAt: Date;
}
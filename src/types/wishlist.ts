import type { ObjectId } from "mongodb";

export interface Wishlist {
  _id?: ObjectId;
  userEmail: string;
  studioId: ObjectId;
  createdAt: Date;
}
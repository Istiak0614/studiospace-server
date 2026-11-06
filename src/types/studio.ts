import type { ObjectId } from "mongodb";

export const CATEGORIES = [
  "Photo Studio",
  "Film & Sound Stage",
  "Podcast Lounge",
  "Music Suite",
  "Art Workshop",
] as const;

export type StudioCategory = (typeof CATEGORIES)[number];

export interface Studio {
  _id?: ObjectId;
  title: string;
  category: StudioCategory;
  hourlyRate: number;
  securityDeposit: number;
  maxCapacity: number;
  location: string;
  images: string[];       
  amenities: string[];
  overview: string;
  ownerEmail: string;     
  ownerName: string;
  ownerPhoto?: string;
  rating: number;         
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}
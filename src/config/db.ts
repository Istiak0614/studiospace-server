import type { Studio } from "../types/studio.js";
import "dotenv/config";
import dns from "node:dns";
import { MongoClient } from "mongodb";
import type { Booking } from "../types/booking.js";

if (process.env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is missing. Check your .env file");

export const client = new MongoClient(uri);
export const db = client.db(process.env.DB_NAME ?? "studiospace");
export const studios = db.collection<Studio>("studios");
export const bookings = db.collection<Booking>("bookings");
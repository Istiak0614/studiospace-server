import { bookings, reviews, studios, wishlists } from "../config/db.js";

export async function ensureIndexes() {
  await Promise.all([
    studios.createIndexes([
      { key: { ownerEmail: 1 } },                
      { key: { category: 1, rating: -1 } },       
      { key: { hourlyRate: 1 } },                 
      { key: { createdAt: -1 } },                 
    ]),
    bookings.createIndexes([
      { key: { studioId: 1, status: 1, startTime: 1 } }, 
      { key: { guestEmail: 1, startTime: -1 } },         
      { key: { hostEmail: 1, createdAt: -1 } },          
    ]),
    reviews.createIndexes([
      { key: { bookingId: 1 }, unique: true },    
      { key: { studioId: 1, createdAt: -1 } },    
    ]),
    wishlists.createIndexes([
      { key: { userEmail: 1, studioId: 1 }, unique: true }, 
    ]),
  ]);
}
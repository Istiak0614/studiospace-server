import "dotenv/config"; 
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { db } from "./config/db.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import tokenRoutes from "./modules/auth/token.routes.js";
import studioRoutes from "./modules/studio/studio.routes.js";
import bookingRoutes from "./modules/booking/booking.routes.js";
import reviewRoutes from "./modules/review/review.routes.js";
import wishlistRoutes from "./modules/wishlist/wishlist.routes.js";


const app = express();
app.set("trust proxy", 1); 

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({ message: "StudioSpace API is running" });
});


app.get("/api/health", async (_req, res) => {
  await db.command({ ping: 1 });
  res.json({ status: "ok", database: "connected", time: new Date().toISOString() });
});

app.use("/api", tokenRoutes);
app.use("/api/studios", studioRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT ?? 5000;
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

export default app;
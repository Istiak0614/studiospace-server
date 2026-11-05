import "dotenv/config"; 
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { db } from "./config/db.js";

const app = express();
app.set("trust proxy", 1); 

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({ message: "StudioSpace API is running" });
});


app.get("/api/health", async (_req, res) => {
  await db.command({ ping: 1 }); // if this fails, the error handler returns 500
  res.json({ status: "ok", database: "connected", time: new Date().toISOString() });
});

app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT ?? 5000;
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

export default app;
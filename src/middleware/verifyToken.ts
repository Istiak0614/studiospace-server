import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { JWT_COOKIE, type TokenUser } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenUser;
    }
  }
}

export const verifyToken: RequestHandler = (req, res, next) => {
  const token = req.cookies?.[JWT_COOKIE];

  if (!token) {
    res.status(401).json({ message: "Unauthorized: please log in" });
    return;
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET as string) as TokenUser;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized: your session has expired, please log in again" });
  }
};
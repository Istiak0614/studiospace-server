import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, JWT_COOKIE, jwtCookieOptions, signApiToken } from "../../lib/auth.js";
import { verifyToken } from "../../middleware/verifyToken.js";

const router = Router();
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; 

router.post("/jwt", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });

  if (!session) {
    res.status(401).json({ message: "Unauthorized: please log in" });
    return;
  }

  const { id, email, name } = session.user;
  res.cookie(JWT_COOKIE, signApiToken({ id, email, name }), {
    ...jwtCookieOptions,
    maxAge: SEVEN_DAYS_MS,
  });
  res.json({ success: true });
});

router.get("/me", verifyToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
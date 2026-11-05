import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { APIError, createAuthMiddleware } from "better-auth/api";
import jwt from "jsonwebtoken";
import { client, db } from "../config/db.js";

const SEVEN_DAYS = 60 * 60 * 24 * 7; // in seconds
const isProd = process.env.NODE_ENV === "production";

export const JWT_COOKIE = "ss_token";

export interface TokenUser {
  id: string;
  email: string;
  name: string;
}

export const signApiToken = (user: TokenUser) =>
  jwt.sign(user, process.env.JWT_SECRET as string, { expiresIn: "7d" });

export const jwtCookieOptions = {
  httpOnly: true,                     
  secure: isProd,                       
  sameSite: "lax" as const,             
  path: "/",
};

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,


  database: mongodbAdapter(db, { client }),

  trustedOrigins: [process.env.CLIENT_URL as string],

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,     
    minPasswordLength: 6,  
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  session: { expiresIn: SEVEN_DAYS },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const password: string = ctx.body?.password ?? "";
        if (!/[A-Z]/.test(password)) {
          throw new APIError("BAD_REQUEST", { message: "Password must include an uppercase letter" });
        }
        if (!/[a-z]/.test(password)) {
          throw new APIError("BAD_REQUEST", { message: "Password must include a lowercase letter" });
        }
      }
    }),

    after: createAuthMiddleware(async (ctx) => {
      const newSession = ctx.context.newSession;
      if (newSession) {
        const { id, email, name } = newSession.user;
        ctx.setCookie(JWT_COOKIE, signApiToken({ id, email, name }), {
          ...jwtCookieOptions,
          maxAge: SEVEN_DAYS, // BetterAuth uses seconds
        });
      }

      if (ctx.path === "/sign-out") {
        ctx.setCookie(JWT_COOKIE, "", { ...jwtCookieOptions, maxAge: 0 });
      }
    }),
  },
});
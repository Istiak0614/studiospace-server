# StudioSpace — API Server

Express + MongoDB REST API for **StudioSpace**, a peer-to-peer marketplace where hosts list creative spaces (photo studios, film & sound stages, podcast lounges, music suites, art workshops) and creators book them by the hour.

- **Live API:** https://studiospace-server-sepia.vercel.app
- **Live site:** https://studiospace-client-lovat.vercel.app
- **Client repo:** studiospace-client

## Features

- **Authentication with BetterAuth** — email/password and Google sign-in, stored in MongoDB; password rules (uppercase, lowercase, 6+ chars) enforced on the server; duplicate emails blocked.
- **JWT in an HTTPOnly cookie (Challenge 1)** — issued on every login; `verifyToken` protects all write routes and returns **401** without a valid token. Owner checks return **403**.
- **Double-booking prevention (Challenge 2)** — a booking can't overlap any **Confirmed** booking for the same studio. Checked on create *and* again when the host confirms; confirming a slot auto-declines overlapping pending requests.
- **Booking lifecycle** — Pending → Confirmed (host) → Completed (automatically after the end time); creators can cancel while Pending; unanswered requests expire.
- **Search & filters** — `$regex` search on title/location, category, price range, 4 sort orders, pagination.
- **Reviews** — only from Completed bookings, one per booking; studio ratings recalculated with an aggregation.
- **Wishlist** — toggle saved studios; `$lookup` returns full studio cards.
- **Dashboard stats** — counts, total earnings and earnings for the last 6 months grouped by month in the user's time zone.

## Tech stack

Node.js · Express 5 · TypeScript · MongoDB (native driver) · BetterAuth · jsonwebtoken · Vitest · Vercel

## API

🔒 = requires the JWT cookie (401 otherwise)

| Method | Route | Description |
|---|---|---|
| ALL | `/api/auth/*` | BetterAuth (sign-up, sign-in, Google, sign-out, session) |
| POST | `/api/jwt` | Re-issue the JWT from a valid session |
| GET | `/api/studios` | List with `q`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, `limit` |
| GET | `/api/studios/featured` | Top-rated 6 |
| GET | `/api/studios/:id` | Studio details |
| GET | `/api/studios/:id/reviews` | Reviews for a studio |
| GET | `/api/studios/:id/booked-slots?from&to` | Confirmed time ranges |
| GET 🔒 | `/api/studios/mine` | My listings |
| POST 🔒 | `/api/studios` | Create a studio |
| PATCH 🔒 | `/api/studios/:id` | Update (owner only) |
| DELETE 🔒 | `/api/studios/:id` | Delete (owner only; blocked if upcoming confirmed bookings) |
| POST 🔒 | `/api/bookings` | Request a booking (409 on overlap) |
| GET 🔒 | `/api/bookings/mine` | My bookings |
| PATCH 🔒 | `/api/bookings/:id/cancel` | Cancel a pending booking |
| GET 🔒 | `/api/bookings/requests` | Requests for my studios |
| PATCH 🔒 | `/api/bookings/:id/status` | Confirm or decline (host only) |
| POST 🔒 | `/api/reviews` | Review a completed booking |
| GET 🔒 | `/api/reviews/mine` | Booking ids I've reviewed |
| GET 🔒 | `/api/wishlist` · `/api/wishlist/ids` | Saved studios / ids |
| POST 🔒 | `/api/wishlist/:studioId` | Toggle saved |
| GET 🔒 | `/api/dashboard/stats?tz=` | Dashboard data |
| GET | `/api/health` | API + database health |

## Getting started

```bash
git clone https://github.com/Istiak0614/studiospace-server.git
cd studiospace-server
npm install
cp .env.example .env   # then fill in the values below
npm run seed           # sample studios, reviews and indexes
npm run dev            # http://localhost:5000
```

### Environment variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `DB_NAME` | Database name (`studiospace`) |
| `BETTER_AUTH_SECRET` | Random 32+ character secret |
| `BETTER_AUTH_URL` | The **client** URL (auth requests arrive through the client's `/api` rewrite) |
| `CLIENT_URL` | The client URL (CORS + trusted origin) |
| `JWT_SECRET` | Random 32+ character secret for the API token |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |

### Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start with auto-reload |
| `npm run typecheck` | TypeScript check |
| `npm run seed` | Upsert sample studios, seed reviews, create indexes, recalculate ratings |
| `npm test` | Unit tests (Vitest) |

## Project structure
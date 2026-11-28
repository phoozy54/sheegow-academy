# SHEEGOW ACADEMY

**Live English Learning Platform** — teaches English to learners everywhere through LIVE interactive online classes. No recorded videos — every class is a real-time video session with expert teachers.

Founded and led by **Ciise Mohamed Sheeq (SHEEGOW)** — an English language expert with a university degree, multiple language certifications and 15 years of teaching experience. He is the founder, general manager and super admin of the platform.

Built with Next.js 16, TypeScript, Prisma/PostgreSQL (Neon), Socket.io, and Tailwind CSS.

**Canonical architecture (DEP-1):** Vercel (Next.js app + API) · Neon Postgres (database) · Render (`sheegow-chat` only) · Cloudflare DNS. See [`DEPLOYMENT.md`](./DEPLOYMENT.md). The older self-host SQLite/Caddy toolchain (`.zscripts/`, `Caddyfile`) is **archived, non-canonical**. Health endpoint: `GET /api/health` (`no-store`, `503` if the DB check fails).

---

## Features

- **LIVE video classes** — real one-to-many WebRTC video: teacher publishes camera/mic, students receive (with chat + hand-raise)
- **Real-time chat** — Socket.io-powered live class chat sidebar
- **Role-aware unified dashboard** — students, teachers, admins and super admins use one portal that adapts to their role
- **Course catalog** — courses are created by teachers/admins (no seeded demo courses)
- **Enrollment & payments** — secure checkout with coupon codes; the full amount and available payment methods are shown only at checkout. Paid classes require enrollment + completed payment before joining
- **Admin panel** — course CRUD, user management, live class scheduling, revenue charts
- **Auth** — short-lived access + refresh JWTs in scoped httpOnly cookies, bcrypt hashing, rate-limited login/register; username, email or phone login
- **Responsive** — mobile-first design with larger drawers/dashboards that work on phones

### Roles & access rules

| Role | What they can do |
|------|------------------|
| **super_admin** | Full access. The **only** role that can create teachers/admins, change roles, manage payments and grant super-admin access. |
| **admin** | Admin access: manage courses, students, live classes and payments (payment *status edits* are super-admin only). Cannot create teachers. |
| **teacher** | Creates and manages **their own** courses and live classes only. Cannot manage other users or payments. |
| **student** | Registers freely, browses courses, enrolls and pays. **Cannot join a class until enrolled and payment is completed.** |

> There are **no demo users**. The seed creates only the bootstrap super admin
> (and two starter coupons). Sign in as `superadmin@sheegow.academy` using the
> `SUPER_ADMIN_PASSWORD` you set, then create teachers from **Admin → Teachers**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | Next.js API Routes (REST) |
| Database | Prisma ORM with PostgreSQL (Neon) — canonical for all environments |
| Real-time | Socket.io (separate mini-service on port 3003) + native WebRTC |
| Auth | Short-lived JWT access + refresh tokens in httpOnly cookies, bcrypt |
| Charts | Recharts |
| State | Zustand |

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- A PostgreSQL `DATABASE_URL` (Neon for production; a local Postgres or Neon branch for development)

### Installation

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Edit .env — set JWT_SECRET and JWT_REFRESH_SECRET to strong random strings,
# and SUPER_ADMIN_PASSWORD for the bootstrap account.

# Create the database schema on an EMPTY database, then seed ONLY the super admin + starter coupons
# `db:push` deliberately has no --accept-data-loss flag. For an existing database
# with real data, use reviewed migrations (`bun run db:deploy`) after a snapshot.
bun run db:push
bun prisma/seed.ts
```

Seeding creates **no demo users, courses or classes**. Sign in as
`superadmin@sheegow.academy` with your `SUPER_ADMIN_PASSWORD`, then add teachers
and courses from the dashboard. To (re)set the super admin password later, run
`bun run db:superadmin`.

### Running the app

```bash
# Start the Next.js dev server (port 3002)
bun run dev

# In a separate terminal, start the Socket.io chat service (port 3003)
cd mini-services/chat-service
bun install
bun run dev
```

The app runs at `http://localhost:3002`.

### First login

Sign in at `superadmin@sheegow.academy` with the `SUPER_ADMIN_PASSWORD` you set
in `.env`. All roles log in through the same auth modal and land in the
**unified dashboard**, which adapts its sidebar and content to the user's role.
Students self-register through the same modal. Every account has a unique
username; the founder is assigned `@superadmin`, the first admin `@admin`, and
all other accounts get a generated handle. Anyone can log in with their
**username, email or phone number** (plus password), and can change their
username under Profile Settings. After a schema push, run `bun run db:usernames`
once to add usernames to existing accounts.

## Project Structure

```
sheegow-academy/
├── prisma/
│   ├── schema.prisma          # Database models
│   └── seed.ts                 # Bootstrap super admin + starter coupons only (no demo data)
├── src/
│   ├── app/
│   │   ├── api/                # REST API routes (auth, courses, enrollments, live, payments, users, stats, contact, socket/token, rtc/ice)
│   │   ├── globals.css         # Indigo + amber design system, Poppins font
│   │   ├── layout.tsx
│   │   └── page.tsx            # Single-page app with state-based view routing
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   └── sheegow/
│   │       ├── navbar.tsx
│   │       ├── footer.tsx
│   │       ├── auth-modal.tsx
│   │       ├── course-card.tsx
│   │       └── views/
│   │           ├── home-view.tsx
│   │           ├── courses-view.tsx
│   │           ├── course-detail-view.tsx
│   │           ├── live-classes-view.tsx
│   │           ├── live-room-view.tsx      # Live video + chat
│   │           ├── about-view.tsx
│   │           ├── contact-view.tsx
│   │           ├── dashboard-view.tsx     # Legacy student dashboard
│   │           ├── my-courses-view.tsx
│   │           ├── profile-view.tsx
│   │           ├── checkout-view.tsx       # Card + Zaad Service + Edahab
│   │           ├── unified-dashboard.tsx   # Role-aware portal (student/teacher/admin)
│   │           └── admin/                  # Admin sub-views
│   │               ├── admin-dashboard.tsx
│   │               ├── admin-courses.tsx
│   │               ├── admin-students.tsx
│   │               ├── admin-live.tsx
│   │               └── admin-teachers.tsx
│   └── lib/
│       ├── db.ts              # Prisma client
│       ├── auth.ts            # JWT, bcrypt, cookie helpers
│       ├── api.ts             # Frontend API client
│       ├── store.ts           # Zustand store (navigation + auth state)
│       ├── socket.ts          # Socket.io client (class-scoped token bootstrap)
│       ├── webrtc.ts          # LiveStreamManager (one-to-many WebRTC)
│       ├── rate-limit.ts      # In-process rate limiter (use Redis in prod)
│       ├── types.ts           # Shared TypeScript types
│       └── ui.ts              # UI helpers (formatters, badges)
├── mini-services/
│   └── chat-service/          # Socket.io chat server (port 3003)
│       ├── index.ts
│       └── package.json
├── public/images/             # Generated course/teacher images
└── package.json
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Create student account
- `POST /api/auth/login` — Login (sets httpOnly cookies; rate limited)
- `POST /api/auth/logout` — Clear cookies
- `GET /api/auth/me` — Current user
- `POST /api/auth/refresh` — Refresh access token (refresh cookie only)
- `POST /api/auth/change-password` — Change own password
- `GET /api/users/me` — Own profile

### Courses
- `GET /api/courses` — List (filters: `?level=&search=&page=&limit=`)
- `GET /api/courses/:id` — Single course with teacher + reviews
- `POST /api/courses` — Create (teacher/admin)
- `PUT /api/courses/:id` — Update (teacher/admin)
- `DELETE /api/courses/:id` — Delete (admin)
- `POST /api/courses/:id/reviews` — Add review (student)

### Enrollments
- `GET /api/enrollments/my` — My enrolled courses
- `POST /api/enrollments` — Enroll in a course

### Live Classes
- `GET /api/live` — All live classes
- `GET /api/live/upcoming` — Upcoming + live now
- `GET /api/live/:id` — Single live class
- `POST /api/live` — Schedule (teacher/admin)
- `PUT /api/live/:id/start` — Start session
- `PUT /api/live/:id/end` — End session
- `GET /api/live/:id/messages` — Chat history
- `POST /api/live/:id/messages` — Send message

### Payments
- `POST /api/payments/checkout` — Pay + auto-enroll (mock checkout only when `DEMO_MODE=true` or in dev; returns `503` in production otherwise)
- `GET /api/payments/history` — Payment history
- `POST /api/payments/coupon/validate` — Validate coupon code

### Users (admin)
- `GET /api/users` — List (filters: `?role=&search=`)
- `POST /api/users` — Create user (only super admin can create teachers/admins)
- `PUT /api/users/:id` — Update (role changes are super-admin only)
- `DELETE /api/users/:id` — Delete

### Other
- `POST /api/contact` — Contact form
- `GET /api/stats` — Admin dashboard stats
- `GET /api/socket/token?classId=` — Short-lived, class-scoped chat/WebRTC token (enrollment + payment enforced for students)
- `GET /api/rtc/ice` — STUN + short-lived coturn TURN credentials for WebRTC

## Database Schema

Models: `User`, `Course`, `Enrollment`, `LiveClass`, `Payment`, `Review`, `Message`, `ContactMessage`, `Coupon`.

See `prisma/schema.prisma` for full definitions.

## Production Setup

### Environment Variables
Copy `.env.example` to `.env`. Generate strong secrets:
```bash
openssl rand -hex 32  # for JWT_SECRET
openssl rand -hex 32  # for JWT_REFRESH_SECRET (a DIFFERENT value)
```

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string in production |
| `JWT_SECRET` | Yes (prod) | App **fails closed** without it. Must be the **same** value on the chat service. |
| `JWT_REFRESH_SECRET` | Yes (prod) | Separate secret for refresh tokens |
| `SUPER_ADMIN_PASSWORD` | Yes (seed) | Bootstrap super admin password; `db:superadmin` also rotates it |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical origin: `https://www.sheegowacademy.com` |
| `APP_ORIGIN` | No | Comma-separated CORS allowlist for the chat service |
| `NEXT_PUBLIC_CHAT_URL` | Yes (prod) | HTTPS Render chat URL; falls back to `https://sheegow-chat.onrender.com` |
| `DEMO_MODE` | No | Keep `false` in production — enables mock (no-charge) checkout |
| `TURN_URL` | No | Server-side coturn URL; short-lived credentials minted via `/api/rtc/ice` |
| `TURN_SECRET` | No | Server-side coturn REST secret — **never** use a `NEXT_PUBLIC_` prefix |

> Production refuses to run auth without `JWT_SECRET` / `JWT_REFRESH_SECRET`, and
> mock checkout is disabled unless `DEMO_MODE=true`. TURN credentials are never
> shipped in the browser bundle.

### Live Video (real camera + microphone)
The live room uses native **WebRTC** — no paid video service or API keys needed:

- The **teacher / admin / super admin** clicks **"Start Camera & Mic"** in the live room.
  The browser requests camera + microphone permission (`getUserMedia`) and the stream
  is published to every student in the room.
- **Students** receive the video/audio automatically and can still chat and raise hands.
- The Socket.io chat service (`mini-services/chat-service`) doubles as the WebRTC
  **signaling** relay (`broadcast-start`, `webrtc-offer`, `webrtc-answer`, `webrtc-ice`).
  Only one teacher broadcasts per class at a time.
- Browser client: `src/lib/webrtc.ts` (`LiveStreamManager`) + `live-room-view.tsx`.

Requirements / notes:
- **HTTPS is required** for `getUserMedia` (localhost works in development).
- Public STUN servers are configured. On restrictive networks, set server-side
  `TURN_URL` + `TURN_SECRET`; the app mints short-lived coturn credentials at
  `/api/rtc/ice`. **Never** put TURN secrets in `NEXT_PUBLIC_*` variables.
- Only the assigned teacher (or an admin/super admin) may broadcast. Students get
  a class-scoped socket token only after enrollment + completed payment, and cannot
  publish their own camera/mic.
- The teacher must click **"Start Now"** on the class in the admin dashboard first so
  the class status becomes `live`, then **"View Room"**, then **"Start Camera & Mic"**.
- The chat service must be **rebuilt and redeployed** after changing it, so the new
  signaling events are available in production. Set the same `JWT_SECRET` on Render.

### Deploy
- **Frontend**: Deploy to Vercel (`vercel deploy`)
- **Database**: PostgreSQL via `DATABASE_URL` (see `DEPLOYMENT.md`)
- **Chat service**: Deploy only `mini-services/chat-service` via the existing
  Render Blueprint (`render.yaml`). Render supplies the port (`PORT=10000`); this
  service also powers live video signaling. No Railway/second app deployment.

## License

MIT — built for SHEEGOW ACADEMY.

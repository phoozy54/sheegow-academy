# SHEEGOW ACADEMY

**Live English Learning Platform** — teaches English to Somali-speaking students through LIVE interactive online classes. No recorded videos — every class is a real-time video session with expert teachers.

Built with Next.js 16, TypeScript, Prisma (SQLite), Socket.io, and Tailwind CSS.

---

## Features

- **LIVE video classes** — real-time interactive video room with mic/camera/hand-raise controls
- **Real-time chat** — Socket.io-powered live class chat sidebar
- **Role-aware unified dashboard** — students, teachers, and admins all use one portal that adapts to their role
- **Course catalog** — 6 seeded English courses (Beginner, Intermediate, Advanced, IELTS, Kids)
- **Enrollment & payments** — Stripe, EVC Plus, and Zaad (Somali mobile wallets) with coupon codes
- **Admin panel** — course CRUD, student/teacher management, live class scheduling, revenue charts
- **Auth** — JWT in httpOnly cookies, bcrypt password hashing
- **Responsive** — mobile-first design, works on all screen sizes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | Next.js API Routes (REST) |
| Database | Prisma ORM + SQLite |
| Real-time | Socket.io (separate mini-service on port 3003) |
| Auth | JWT (access + refresh tokens), bcrypt |
| Charts | Recharts |
| State | Zustand |

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- A SQLite database (auto-created)

### Installation

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Edit .env — set JWT_SECRET and JWT_REFRESH_SECRET to strong random strings

# Create the database and seed demo data
bun run db:push
bun prisma/seed.ts
```

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

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@sheegow.academy` | `admin123` |
| Teacher | `amina@sheegow.academy` | `teacher123` |
| Student | `student@sheegow.academy` | `student123` |

All three roles log in through the same auth modal and land in the **unified dashboard**, which adapts its sidebar and content to the user's role.

## Project Structure

```
sheegow-academy/
├── prisma/
│   ├── schema.prisma          # Database models
│   └── seed.ts                 # Demo data (users, courses, live classes)
├── src/
│   ├── app/
│   │   ├── api/                # REST API routes (auth, courses, enrollments, live, payments, users, stats, contact)
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
│   │           ├── checkout-view.tsx       # Stripe + EVC Plus + Zaad
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
│       ├── socket.ts          # Socket.io client singleton
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
- `POST /api/auth/login` — Login (sets httpOnly cookies)
- `POST /api/auth/logout` — Clear cookies
- `GET /api/auth/me` — Current user
- `POST /api/auth/refresh` — Refresh access token

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
- `POST /api/payments/checkout` — Pay (Stripe/EVC Plus/Zaad) + auto-enroll
- `GET /api/payments/history` — Payment history
- `POST /api/payments/coupon/validate` — Validate coupon code

### Users (admin)
- `GET /api/users` — List (filters: `?role=&search=`)
- `PUT /api/users/:id` — Update
- `DELETE /api/users/:id` — Delete

### Other
- `POST /api/contact` — Contact form
- `GET /api/stats` — Admin dashboard stats

## Database Schema

Models: `User`, `Course`, `Enrollment`, `LiveClass`, `Payment`, `Review`, `Message`, `ContactMessage`, `Coupon`.

See `prisma/schema.prisma` for full definitions.

## Production Setup

### Environment Variables
Generate strong secrets:
```bash
openssl rand -hex 32  # for JWT_SECRET
openssl rand -hex 32  # for JWT_REFRESH_SECRET
```

### Live Video Integration
The live room currently uses a stylized mock video UI. To add real video:
- Sign up at [Agora.io](https://agora.io) and get an App ID + Certificate
- Add `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` to `.env`
- Install `agora-rtc-sdk-ng` and wire it into `live-room-view.tsx`

### Deploy
- **Frontend**: Deploy to Vercel (`vercel deploy`)
- **Database**: Switch from SQLite to PostgreSQL by changing the Prisma `datasource` provider and `DATABASE_URL`
- **Chat service**: Deploy the `mini-services/chat-service` to Render/Railway on port 3003

## License

MIT — built for SHEEGOW ACADEMY.

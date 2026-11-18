# Task 4 — Build all API routes for SHEEGOW ACADEMY

**Agent:** API routes builder
**Status:** Completed
**Scope:** All REST API route handlers under `src/app/api/` + a small helper module.

## Files created

### Helper module
- `src/lib/api-helpers.ts` — exports `jsonError(message, status)`, `jsonOk(data, status)`, `handleAuthError(e)`, `safeBody<T>(req)`, and `nonEmpty(value)`.

### AUTH (`src/app/api/auth/`)
- `register/route.ts` — POST: create student account, hash password, set cookies, return user (no password). 409 on duplicate email. Validates email + password length.
- `login/route.ts` — POST: verify creds, set cookies, return user. 401 on bad creds. 403 if account is inactive.
- `logout/route.ts` — POST: clearAuthCookies + success.
- `me/route.ts` — GET: getCurrentUser → user or 401.
- `refresh/route.ts` — POST: read refresh cookie, verify, issue fresh cookies via `setAuthCookies`, return user.

### COURSES (`src/app/api/courses/`)
- `route.ts` — GET list with `?level=&search=&page=&limit=`, includes teacher, returns `{ items, total, page, limit, totalPages }`. POST create (requireTeacherOrAdmin) with fields: title, description, level, price, duration, image, teacherId, whatYouLearn.
- `[id]/route.ts` — GET single (teacher + reviews with student info + reviewCount via course.reviewCount). PUT update (requireTeacherOrAdmin). DELETE (requireAdmin).
- `[id]/reviews/route.ts` — POST: create review (requireAuth). Prevents duplicates via the `studentId_courseId` unique constraint (returns 409). Recomputes aggregate `rating` + `reviewCount` via `db.review.aggregate`.

### ENROLLMENTS (`src/app/api/enrollments/`)
- `route.ts` — POST `{ courseId }` (requireAuth). Idempotent — returns existing enrollment if already enrolled. Returns course + teacher.
- `my/route.ts` — GET (requireAuth). Returns current user's enrollments with course + teacher + payment.

### LIVE CLASSES (`src/app/api/live/`)
- `route.ts` — GET list (sorted by scheduledAt asc, includes course + teacher). POST create (requireTeacherOrAdmin).
- `upcoming/route.ts` — GET (scheduledAt >= now OR status = "live", sorted asc, includes course + teacher).
- `[id]/route.ts` — GET single (with course + teacher).
- `[id]/start/route.ts` — PUT (requireTeacherOrAdmin) sets status "live".
- `[id]/end/route.ts` — PUT (requireTeacherOrAdmin) sets status "ended".
- `[id]/messages/route.ts` — GET messages (with sender fullName + profilePicture). POST `{ text }` (requireAuth) creates message.

### PAYMENTS (`src/app/api/payments/`)
- `checkout/route.ts` — POST `{ courseId, method, couponCode? }` (requireAuth). Validates coupon (active + not expired), creates Payment (status "completed", mock transactionId), auto-enrolls (creates or links enrollment with progress 0), returns `{ payment, enrollment, finalAmount }`.
- `history/route.ts` — GET (requireAuth). Returns current user's payments with course included.
- `coupon/validate/route.ts` — POST `{ code, courseId }`. Returns `{ valid: true, discount }` or `{ valid: false }`.

### USERS / ADMIN (`src/app/api/users/`)
- `route.ts` — GET (requireAdmin). List users (excludes password). Supports `?role=` and `?search=` (matches name OR email via `contains`).
- `[id]/route.ts` — PUT (requireAdmin) updates fullName, email, phone, role, level, isActive with validation. DELETE (requireAdmin) — cannot delete self, cannot self-demote or self-deactivate.

### CONTACT (`src/app/api/contact/`)
- `route.ts` — POST (public). Validates name/email/subject/message, creates ContactMessage.
- `messages/route.ts` — GET (requireAdmin). Lists contact messages sorted by createdAt desc.

### STATS / ADMIN DASHBOARD (`src/app/api/stats/`)
- `route.ts` — GET (requireAdmin). Returns:
  - `totalStudents`, `totalCourses`, `totalEnrollments`, `totalRevenue` (sum of completed payments), `liveClassesCount`
  - `recentEnrollments` (last 5 with studentName + courseTitle + enrolledAt)
  - `revenueByMonth` (last 6 months array of `{ month: "YYYY-MM", revenue }`)
  - `enrollmentsByLevel` (group enrollments by course level — array of `{ level, count }`)

## Implementation notes
- Every handler wraps in `try/catch` and uses `handleAuthError(e)` to map `UNAUTHORIZED` → 401, `FORBIDDEN` → 403, otherwise returns a generic 500.
- All Prisma queries use `select` (not `omit`) to guarantee the `password` field is never serialized to the client. The only place `password` is read is `login` (where it is never returned).
- Next.js 16 dynamic route `params` is awaited (`params: Promise<{ id: string }>`).
- SQLite doesn't support `mode: "insensitive"`, so `contains` is used directly for search.
- Pagination default: page=1, limit=10, response shape `{ items, total, page, totalPages, limit }`.
- `setAuthCookies` is reused for register, login, and refresh to rotate both access + refresh tokens.
- Checkout is idempotent: if the student is already enrolled, the new payment is linked to the existing enrollment rather than failing.
- Review creation updates the course's aggregate `rating` (avg) and `reviewCount` using `db.review.aggregate`.

## Lint
Ran `bun run lint` — passes cleanly for all created files (see final verification in chat).

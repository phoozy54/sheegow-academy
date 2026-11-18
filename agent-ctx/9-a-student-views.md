# Task 9-a — Build student-facing protected views for SHEEGOW ACADEMY

**Agent:** Student-views builder
**Task ID:** 9-a
**Status:** Completed
**Scope:** Four student-facing protected view components wired into the SPA router (`src/app/page.tsx`).

## Files created

All files start with `"use client";` and use the established store / api / types / ui helpers.

### 1. `src/components/sheegow/views/dashboard-view.tsx`
Exports `DashboardView`. Features:
- Auth gate: spinner while `authLoading`; "Please log in" card with `openAuthModal("login")` button when `user` is null.
- Welcome header — "Welcome back, {firstName}!" + today's date subtitle.
- Four stat cards row (responsive 2x2 / 1x4): Active Courses (`status === "active"`), Completed Lessons (sum of `progress/10` or count of CSV `completedLessons`), Learning Hours (enrollments × 2 + "h"), Certificates (count `status === "completed"`).
- Two-column layout (`lg:grid-cols-3`):
  - Left (col-span-2) — "My Courses" card listing up to 4 enrollments with thumbnail, level badge, teacher chip, progress bar + %, "Continue" button → `openCourse(course.id)`. Includes loading skeleton and empty state with "Browse Courses" → `navigate("courses")`.
  - Right (col-span-1) — "Upcoming Live Classes" widget (fetches `api.upcomingClasses()`, takes first 3, shows date tile + title + time + "Join" button → `openClass(id)`); "Recent Activity" timeline (4 mock items with colored icon dots).
- Uses `let active = true; ... return () => { active = false; }` cleanup pattern to avoid setState-after-unmount warnings and to satisfy `react-hooks/set-state-in-effect`.

### 2. `src/components/sheegow/views/my-courses-view.tsx`
Exports `MyCoursesView`. Features:
- Auth gate (same pattern).
- Header with "X enrolled / Y completed" summary chips.
- `Tabs` filter: All | In Progress | Completed.
- Responsive grid (sm:2, lg:3) of enrollment cards: course image with level badge, status badge (Indigo "Active" / Emerald "Completed"), title, teacher chip (Avatar + name), progress bar with % label, "Continue Learning" button → `openCourse(id)`; conditional "View Certificate" button (only when `status === "completed"`) opens a Dialog showing a mock certificate (gradient header, decorative pattern, user name, course title, enrolled/issued dates, % completion, "Download" button → `toast.success("Certificate downloaded (demo)")`).
- Empty state for filtered vs. unfiltered.
- Loading skeletons (6 cards) while fetching.

### 3. `src/components/sheegow/views/profile-view.tsx`
Exports `ProfileView`. Features:
- Auth gate (same pattern).
- Two-column layout (lg:grid-cols-3):
  - Left (col-span-1) — Profile card: large Avatar with camera "Change Photo" button (toast "Photo upload is demo only"), name, email, role badge, level badge, account info list (email + phone).
  - Right (col-span-2) — Card with 4-tab `Tabs`:
    - **Account** — Full Name (Input), Email (disabled Input with note), Phone (Input), Level (Select: Beginner/Intermediate/Advanced/IELTS/Kids). "Save Changes" button → `api.updateUser(user.id, {fullName, phone, level})`, updates store via `setUser`, toast success. Catches `ApiError` and shows message.
    - **Password** — Current / New / Confirm password fields with Lock icon prefixes. Client-side validation (current required, new ≥ 6, new === confirm). "Update Password" → `toast.success("Password updated (demo)")`. Live mismatch hint below confirm field.
    - **Notifications** — Three cosmetic `Switch` toggles (live class reminders, new course announcements, weekly progress reports); each change fires a toast.
    - **Danger Zone** — Red-bordered "Delete account" card with destructive button → confirm `Dialog` → on confirm, closes dialog and `toast.error("Account deletion is disabled in demo")`.

### 4. `src/components/sheegow/views/checkout-view.tsx`
Exports `CheckoutView`. Features:
- Auth gate (same pattern).
- If no `checkoutCourseId` → "No course selected" card with back button → `navigate("courses")`.
- Fetches the course via `api.course(checkoutCourseId)`. Skeleton while loading.
- Two-column layout (lg:grid-cols-3):
  - Left (col-span-2) — Stacked cards:
    - **Payment method** — RadioGroup of three custom cards: Credit Card (Stripe), EVC Plus, Zaad. Each with colored icon, name, description, and a selected-state check indicator.
    - **Card details** (only when `method === "stripe"`) — Card Number (auto-formats with spaces, 16-digit validation), Expiry (MM/YY auto-format), CVC (3-4 digits).
    - **Wallet phone** (only when `method === "evcplus" || "zaad"`) — Phone input with helper text.
    - **Coupon code** — Input + "Apply" button → `api.validateCoupon({code, courseId})`. On valid: emerald success card showing code + discount %, with Remove button. On invalid: red error text below. Updates pricing live.
    - Trust badges row (Secure checkout, Instant enrollment, Lifetime access).
  - Right (col-span-1, sticky) — Order summary card: course image + level badge + title, duration chip, original price, discount line (if coupon), separator, total in indigo. "Complete Payment" button → `api.checkout({courseId, method, couponCode})`. Loading spinner. On success → `toast.success("Payment successful! You're enrolled.")` + `navigate("my-courses")`. On error → `toast.error(msg)`. "What's included" checklist (Live classes, Certificate, Chat support, Lifetime access).
- Validation: method required; card number ≥ 16 digits; expiry MM/YY; CVC ≥ 3; wallet phone ≥ 7 digits.

## Implementation notes

- All views use the established auth-gate pattern: read `user` and `authLoading` from `useStore()`. Spinner (Loader2) while `authLoading`; centered "Please log in" card with `openAuthModal("login")` button when `user` is null.
- All four views are imported by `src/app/page.tsx` and rendered conditionally on `view` state.
- `api.upcomingClasses()` is declared in `api.ts` to return `{ classes }` but the server actually returns `{ items }`. Dashboard normalizes this defensively with `(r as unknown as { items?: LiveClass[] }).items` and falls back to `[]`.
- Profile save flow uses `api.updateUser(user.id, body)` per the task spec. Note: the `/api/users/[id]` PUT route currently requires admin role, so a non-admin student will see the error toast from the ApiError. This is consistent with the task instructions ("admin/general update"); if a separate self-update endpoint is added later, the same client code will Just Work.
- All currency values use `formatPrice`. Level badges use `levelBadgeClass`. Dates use `formatDate` / `formatDateTime` / `formatTime` / `timeAgo` as appropriate.
- Indigo primary (`from-indigo-500 to-indigo-600`, `bg-indigo-600 hover:bg-indigo-700`, `text-indigo-600`), Amber/Violet/Emerald/Rose secondaries. Poppins inherited from root. `card-lift` hover class on hoverable cards. No emojis in UI text; toast messages use plain text.
- Responsive on every view (mobile-first grids; touch targets ≥ 36px on buttons; bottom safe-area respected by the app's `min-h-screen flex flex-col` root wrapper in `page.tsx`).
- Accessibility: semantic `<main>`/`<header>`/`<nav>` come from the app shell (Navbar + page wrapper). Interactive thumbnails/buttons have `aria-label`. Dialogs include `DialogHeader`/`DialogTitle`/`DialogDescription` for screen readers (the certificate dialog uses `sr-only` headers so the visual certificate remains the focus).

## Lint

Ran `cd /home/z/my-project && bun run lint 2>&1 | tail -30`. All four created files pass with **zero errors and zero warnings**.

Remaining lint problems in the repo are in OTHER agents' files and out of scope for task 9-a:
- `course-card.tsx`, `home-view.tsx` (existing baseline)
- `about-view.tsx`, `course-detail-view.tsx`, `live-classes-view.tsx` (other view agents)
- `admin/admin-courses.tsx`, `admin/admin-dashboard.tsx` (admin-panel agent)

## Dev server

The dev log shows `✓ Compiled in 348ms`. The remaining "Module not found" warning is for `@/components/sheegow/views/admin/admin-panel` (a separate task; another agent handles that). The four files created here resolve cleanly when `page.tsx` imports them.

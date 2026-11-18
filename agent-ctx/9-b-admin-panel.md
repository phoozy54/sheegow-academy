# Task 9-b — Build the Admin Panel for SHEEGOW ACADEMY

**Agent:** Admin Panel builder
**Status:** Completed
**Scope:** All admin-side UI under `src/components/sheegow/views/admin/`.

## Files created

### 1. `src/components/sheegow/views/admin/admin-panel.tsx`
Exports `AdminPanel` — the main admin shell.

- **Auth / role guard**: while `authLoading`, shows a centered spinner (`Loader2`). If `user` is null, shows a "Please log in" card with a button that calls `openAuthModal("login")`. If `user.role` is not `"admin"` or `"teacher"`, shows an "Access denied" card with a Back-to-site button.
- **Sidebar nav** (shared between desktop + mobile Sheet): brand header, nav items (Dashboard, Courses, Students, Live Classes, Teachers, Contact Messages), and a footer card with the admin's avatar, name, email, role badge, plus a "Back to site" link.
- **Desktop**: `sticky top-16` left sidebar, width `w-64`, full viewport-height minus navbar.
- **Mobile**: hamburger button in the top bar opens a left-side `Sheet` (via shadcn `Sheet`) with the same sidebar content.
- **Top bar**: page title + subtitle, mobile hamburger, "Back to site" button → `navigate("home")`, admin avatar dropdown with quick links to My Profile, Student Dashboard, Back to site.
- **Content area** renders the active sub-view based on local `adminView` state.
- **Contact Messages view (inlined)**: `AdminMessages` component — fetches `api.contactMessages()`, shows three summary stat cards (Total / Awaiting reply / Resolved), a Table of messages (From, Subject, Received, Status, Actions), a dropdown menu per row (Read message, Reply by email via `mailto:`, Mark resolved/open toggle), and a custom full-card modal dialog for reading a single message with Reply button.

### 2. `src/components/sheegow/views/admin/admin-dashboard.tsx`
Exports `AdminDashboard`.

- Fetches `api.stats()` with loading skeletons and a graceful empty/error state (via `ApiError` + `toast`).
- **4 stat cards**: Total Students (`Users`), Total Courses (`BookOpen`), Total Revenue (`DollarSign`, `formatPrice`), Live Classes (`Video`). Each card has a gradient icon tile, a mock trend badge ("+12%" etc. with `TrendingUp`), and a decorative gradient blob in the corner.
- **Revenue chart**: recharts `BarChart` with indigo gradient fill, last 6 months from `revenueByMonth`, formatted as `$X` tooltips. Shows a `totalRevenue` badge in the header.
- **Enrollments by Level**: recharts `PieChart` (donut) with 6-color palette derived from `enrollmentsByLevel`. Legend + tooltip.
- **Recent Enrollments** table: Student / Course / When (with `timeAgo` + `formatDate`), max 5 rows, with empty state.

### 3. `src/components/sheegow/views/admin/admin-courses.tsx`
Exports `AdminCourses`.

- Fetches `api.courses({ limit: 50 })` and `api.users({ role: "teacher" })` on mount.
- **Toolbar**: search Input (filters by title/description client-side) + "Create Course" button.
- **Table**: image thumb (or `Play` icon placeholder), title + description, level Badge (`levelBadgeClass`), price (`formatPrice`, "Free" if 0), duration (weeks), teacher (avatar + name), status Badge (Active/Hidden), and a per-row DropdownMenu with Edit + Delete actions.
- **Create / Edit Dialog**: form with title, description (Textarea), level (Select), price (number), duration (number weeks), image URL (url), teacher (Select populated from fetched teachers), whatYouLearn (Textarea, one bullet per line). Submit → `api.createCourse(body)` / `api.updateCourse(id, body)` → toast → refetch.
- **Delete**: AlertDialog confirmation → `api.deleteCourse(id)` → toast → refetch.

### 4. `src/components/sheegow/views/admin/admin-students.tsx`
Exports `AdminStudents`.

- Fetches users via `api.users({ role })` based on the active role tab.
- **Toolbar**: Tabs for All / Students / Teachers / Admins + search Input (filters by name, email, phone client-side).
- **Table**: avatar + name + email (with "(You)" indicator for self), contact phone, role badge (color-coded by role), level badge, joined date (`formatDate`), active/inactive status badge (with colored dot).
- **Actions DropdownMenu**: Edit (opens Dialog), Activate/Deactivate toggle (`api.updateUser(id, { isActive: !current })`), Delete (with confirm). The Activate/Deactivate and Delete actions are `disabled` for the current user (`user.id === u.id`) — prevents self-lockout and self-deletion (also enforced server-side).
- **Edit Dialog**: fullName, email, phone, level (Select). Save → `api.updateUser(id, body)` → toast → refetch.

### 5. `src/components/sheegow/views/admin/admin-live.tsx`
Exports `AdminLive`.

- Fetches `api.liveClasses()`, `api.courses({ limit: 50 })`, and `api.users({ role: "teacher" })` in parallel on mount.
- **Sorted cards grid** (`lg:grid-cols-2`): live first, then scheduled, then ended.
- **LiveClassCard**: title, linked course, description, scheduled datetime (`formatDateTime`), duration, teacher avatar+name or "Unassigned", attendee count badge, and contextual action buttons:
  - **Live**: "View Room" (red) → `openClass(id)`, "End Class" (outline red) → `api.endLiveClass(id)`.
  - **Scheduled**: "Start Now" (emerald) → `api.startLiveClass(id)`.
  - **Ended**: "View Recording" (outline) → `openClass(id)`.
- **StatusBadge**: Live = red badge with `animate-ping` dot + ring around card; Scheduled = indigo badge with `Radio` icon; Ended = muted badge.
- **Schedule Dialog**: title, description (Textarea), linked course (Select), teacher (Select), scheduledAt (`datetime-local` Input, defaults to next hour), duration (number minutes, step 15). Submit → `api.createLiveClass(body)` → toast → refetch.

### 6. `src/components/sheegow/views/admin/admin-teachers.tsx`
Exports `AdminTeachers`.

- Fetches `api.users({ role: "teacher" })` and `api.courses({ limit: 50 })` in parallel; counts courses per teacher client-side via `useMemo`.
- **Cards grid** (`sm:grid-cols-2 lg:grid-cols-3`): avatar, name, level badge, active/inactive badge, email, phone, truncated bio (3 lines), assigned-courses count (icon tile), "View Profile" link (opens dialog), "Edit Teacher" button (opens dialog).
- **Edit Dialog**: fullName, email, phone, level (Select), bio (Textarea). Submit → `api.updateUser(id, body)` → toast → refetch.
- **Add Teacher Dialog**: same form, but on submit shows an info toast explaining there's no dedicated create-teacher endpoint yet (the form would create a teacher account in production). Includes an "Info" callout at the top of the dialog explaining this is a demo.
- **View Profile Dialog**: large avatar + name + level badge, contact details, assigned courses count, and full bio (untruncated).

## Implementation notes
- Every file starts with `"use client";`.
- All API errors are caught and surfaced via `sonner` toasts; the `ApiError` message is preferred over a generic string.
- Loading states use the `Skeleton` component for shimmer placeholders.
- Empty states use a centered icon-in-circle layout for visual consistency.
- Confirmation dialogs use `AlertDialog` (not regular `Dialog`) for destructive actions (Delete).
- Indigo is the primary accent throughout (gradient buttons, badges, active nav state). Amber is used for secondary accents (level badges for IELTS, summary cards, etc.).
- `card-lift` hover effect used on stat cards, teacher cards, and live class cards.
- All layouts are responsive (mobile-first), with mobile navigation using the shadcn `Sheet` component.
- The admin panel sits inside `main` below the global `Navbar` (which is `sticky top-0 h-16`), so the admin sidebar and top bar use `sticky top-16` to sit beneath the navbar on scroll.
- The Contact Messages view is inlined in `admin-panel.tsx` (rather than a separate file) because the task only listed the other five views as required separate files.

## Lint
Ran `cd /home/z/my-project && bun run lint 2>&1 | tail -30` — passes with 0 errors and 0 warnings in the six admin files created by this task. The only remaining warnings in the project are pre-existing in `course-card.tsx` and `home-view.tsx` (not created by this agent).

Two issues were caught and fixed during the lint pass:
1. `react-hooks/set-state-in-effect` error in `admin-dashboard.tsx` — removed the synchronous `setLoading(true)` call at the start of the effect (the initial state already has `loading: true` and the effect only runs once on mount).
2. Two unused `eslint-disable` directives — removed from `admin-courses.tsx` (`@next/next/no-img-element` on a course thumbnail `<img>`) and `admin-panel.tsx` (`jsx-a11y/no-static-element-interactions` on the read-message Card).

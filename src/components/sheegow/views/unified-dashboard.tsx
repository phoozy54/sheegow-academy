"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useDevice } from "@/lib/device";
import { api, ApiError } from "@/lib/api";
import type { Course, Enrollment, LiveClass, Payment, RefundRequest, Role, User, WishlistItem } from "@/lib/types";
import {
  cn,
  formatDate,
  formatDateTime,
  formatPrice,
  levelBadgeClass,
} from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Video,
  GraduationCap,
  MessageSquare,
  Menu,
  ArrowLeft,
  LogIn,
  Loader2,
  User as UserIcon,
  Sparkles,
  Award,
  Clock,
  CheckCircle2,
  ArrowRight,
  PlayCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  BookMarked,
  ClipboardCheck,
  Library,
  Hammer,
  Download,
  Heart,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

// Reuse existing admin sub-views
import { AdminDashboard } from "./admin/admin-dashboard";
import { AdminCourses } from "./admin/admin-courses";
import { AdminCourseOverview } from "./admin/admin-course-overview";
import { AdminStudents } from "./admin/admin-students";
import { AdminLive } from "./admin/admin-live";
import { AdminTeachers } from "./admin/admin-teachers";
import { AdminTeacherApplications } from "./admin/admin-teacher-applications";
import { AdminMessages } from "./admin/admin-panel";
import { AdminPayments } from "./admin/admin-payments";
import { AdminTrialRequests } from "./admin/admin-trial-requests";
import { GradebookView } from "./admin/gradebook-view";
import { AdminRefunds } from "./admin/admin-refunds";
import { StudentRefunds } from "./student-refunds";
import { LibraryView } from "./library-view";
import { ContentBuilderView } from "./content-builder-view";
import { GamificationWidget } from "@/components/sheegow/gamification-widget";
import { useT } from "@/lib/i18n";

/* ─── Types ─────────────────────────────────────────────── */

type SectionId =
  | "overview"
  | "courses"
  | "library"
  | "content-builder"
  | "students"
  | "live"
  | "teachers"
  | "teacher-applications"
  | "payments"
  | "my-payments"
  | "my-refunds"
  | "refunds"
  | "trial-requests"
  | "gradebook"
  | "messages"
  | "profile";

interface NavItem {
  id: SectionId;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const ALL_ROLES: Role[] = ["student", "teacher", "admin", "super_admin"];
const ADMIN_ROLES: Role[] = ["admin", "super_admin"];

/* Role-aware navigation. Every role gets Overview, Live Classes and Profile.
   Teachers also see their own students. Admins and super admins see the full
   management suite, with Payments available to both (edits are super-admin only). */
const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "dashboard.overview", icon: LayoutDashboard, roles: ALL_ROLES },
  { id: "courses", label: "dashboard.myCourses", icon: BookOpen, roles: ["student"] },
  { id: "library", label: "dashboard.myLibrary", icon: Library, roles: ["student"] },
  { id: "my-payments", label: "dashboard.myPayments", icon: DollarSign, roles: ["student"] },
  { id: "my-refunds", label: "dashboard.refundRequests", icon: RotateCcw, roles: ["student"] },
  { id: "courses", label: "dashboard.manageCourses", icon: BookOpen, roles: ["teacher", ...ADMIN_ROLES] },
  { id: "content-builder", label: "dashboard.contentBuilder", icon: Hammer, roles: ["teacher", ...ADMIN_ROLES] },
  { id: "live", label: "dashboard.liveClasses", icon: Video, roles: ALL_ROLES },
  { id: "students", label: "dashboard.myStudents", icon: Users, roles: ["teacher"] },
  { id: "students", label: "dashboard.manageStudents", icon: Users, roles: ADMIN_ROLES },
  { id: "teachers", label: "dashboard.teachers", icon: GraduationCap, roles: ADMIN_ROLES },
  { id: "teacher-applications", label: "dashboard.teacherApplications", icon: ClipboardCheck, roles: ADMIN_ROLES },
  { id: "payments", label: "dashboard.payments", icon: DollarSign, roles: ADMIN_ROLES },
  { id: "refunds", label: "dashboard.refunds", icon: RotateCcw, roles: ADMIN_ROLES },
  { id: "trial-requests", label: "dashboard.trialRequests", icon: ClipboardCheck, roles: ADMIN_ROLES },
  { id: "gradebook", label: "dashboard.gradebook", icon: GraduationCap, roles: ["teacher", ...ADMIN_ROLES] },
  { id: "messages", label: "dashboard.messages", icon: MessageSquare, roles: ADMIN_ROLES },
  { id: "profile", label: "dashboard.profile", icon: UserIcon, roles: ALL_ROLES },
];

const SECTION_TITLES: Record<SectionId, string> = {
  overview: "dashboard.sectionOverview",
  courses: "dashboard.sectionCourses",
  library: "dashboard.sectionLibrary",
  "content-builder": "dashboard.sectionContentBuilder",
  students: "dashboard.sectionStudents",
  live: "dashboard.sectionLive",
  teachers: "dashboard.sectionTeachers",
  "teacher-applications": "dashboard.sectionTeacherApplications",
  payments: "dashboard.sectionPayments",
  "my-payments": "dashboard.sectionMyPayments",
  "my-refunds": "dashboard.sectionMyRefunds",
  refunds: "dashboard.sectionRefunds",
  "trial-requests": "dashboard.sectionTrialRequests",
  gradebook: "dashboard.sectionGradebook",
  messages: "dashboard.sectionMessages",
  profile: "dashboard.sectionProfile",
};

const ROLE_LABELS: Record<string, string> = {
  student: "dashboard.roleStudent",
  teacher: "dashboard.roleTeacher",
  admin: "dashboard.roleAdmin",
  super_admin: "dashboard.roleSuperAdmin",
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  student: "border-emerald-200 bg-emerald-50 text-emerald-700",
  teacher: "border-amber-200 bg-amber-50 text-amber-700",
  admin: "border-indigo-200 bg-indigo-50 text-indigo-700",
  super_admin: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
};

/* ─── Main Unified Dashboard ─────────────────────────────── */

export function UnifiedDashboard() {
  const t = useT();
  const { user, authLoading, openAuthModal } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section") as SectionId | null;
  const { isMobile, isTablet } = useDevice();
  const [section, setSection] = useState<SectionId>(
    () => (sectionParam as SectionId) || "overview"
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // A public view can ask the dashboard to open a specific section (e.g. the
  // teacher controls for a course or live class) via ?section=... Sync the
  // local section state when the URL param changes (adjusting state during
  // render to avoid a cascading-render effect).
  const [lastParam, setLastParam] = useState(sectionParam);
  if (sectionParam !== lastParam) {
    setLastParam(sectionParam);
    if (sectionParam) setSection(sectionParam as SectionId);
  }

  // Auth gate — every role must be logged in
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm">{t("dashboard.loadingDashboard")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
            <LogIn className="h-7 w-7 text-indigo-600" />
          </div>
          <h2 className="mb-2 text-xl font-bold">{t("dashboard.pleaseLogin")}</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {t("dashboard.loginForAccess")}
          </p>
          <Button
            onClick={() => openAuthModal("login")}
            className="gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700"
          >
            <LogIn className="h-4 w-4" />
            Log in
          </Button>
        </Card>
      </div>
    );
  }

  const role = user.role as Role;
  const isAdmin = role === "admin" || role === "super_admin";
  // Filter nav items by the current user's role
  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const activeTitle = SECTION_TITLES[section];

  const sidebar = (
    <SidebarContent
      navItems={visibleNav}
      activeView={section}
      user={user}
      onSelect={(v) => {
        setSection(v);
        setMobileNavOpen(false);
      }}
      onBackToSite={() => router.push("/")}
    />
  );

  return (
    <div className="flex bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 border-r bg-card lg:flex lg:flex-col xl:w-80">
        {sidebar}
      </aside>

      {/* Tablet icon rail — persistent navigation without taking horizontal space */}
      {isTablet && (
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-20 shrink-0 flex-col items-center border-r bg-card py-4 md:flex lg:hidden">
          <nav className="flex w-full flex-1 flex-col items-center gap-2">
            {visibleNav.map((item, idx) => {
              const active = section === item.id;
              return (
                <button
                  key={`rail-${item.id}-${idx}`}
                  title={t(item.label)}
                  aria-label={t(item.label)}
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                    active
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </button>
              );
            })}
          </nav>
          <button
            title={t("dashboard.backToSite")}
            aria-label={t("dashboard.backToSite")}
            onClick={() => router.push("/")}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </aside>
      )}

      {/* Mobile sidebar — wider drawer with larger touch targets */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
          <SheetTitle className="sr-only">{t("dashboard.menu")}</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-16 z-30 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className={`h-11 w-11 shrink-0 lg:hidden ${isTablet ? "hidden" : ""}`}
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-foreground sm:text-lg">
                {t(activeTitle)}
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {t(ROLE_LABELS[role])}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/")}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t("dashboard.backToSite")}</span>
              <span className="sm:hidden">{t("dashboard.exit")}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full border p-1 pr-2 transition-colors hover:bg-accent"
                  aria-label="Open profile menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profilePicture || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-bold text-white">
                      {user.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-semibold leading-tight text-foreground">
                      {user.fullName}
                    </p>
                    <p className="text-[10px] leading-tight text-muted-foreground">
                      {user.role}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSection("profile")}>
                  <UserIcon className="h-4 w-4" />
                  {t("dashboard.profileSettings")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSection("overview")}>
                  <LayoutDashboard className="h-4 w-4" />
                  {t("dashboard.dashboardOverview")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/")}>
                  <ArrowLeft className="h-4 w-4" />
                  {t("dashboard.backToSite")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile quick navigation — switch sections without opening the drawer */}
        <nav
          className={`border-b bg-background/80 px-3 py-2 lg:hidden ${isTablet ? "hidden" : ""}`}
        >
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleNav.map((item, idx) => {
              const active = section === item.id;
              return (
                <button
                  key={`quick-${item.id}-${idx}`}
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                    active
                      ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content area — renders role-appropriate content */}
        <main
          className={`flex-1 pb-8 pt-4 sm:pt-6 ${
            isMobile ? "px-3" : isTablet ? "px-5" : "px-6"
          }`}
        >
          <LiveClassReminderBanner role={role} />
          {section === "overview" && <RoleOverview role={role} />}
          {section === "courses" && role === "student" && <StudentMyCourses />}
          {section === "courses" && role === "teacher" && <AdminCourses />}
          {section === "courses" && isAdmin && <AdminCoursesSection />}
          {section === "library" && role === "student" && <LibraryView />}
          {section === "content-builder" && (role === "teacher" || isAdmin) && (
            <ContentBuilderView />
          )}
          {section === "students" && role === "teacher" && <TeacherStudents />}
          {section === "students" && isAdmin && <AdminStudents />}
          {section === "live" && <AdminLive />}
          {section === "teachers" && isAdmin && <AdminTeachers />}
          {section === "teacher-applications" && isAdmin && (
            <AdminTeacherApplications />
          )}
          {section === "payments" && isAdmin && (
            <AdminPayments canManage={isAdmin} />
          )}
          {section === "refunds" && isAdmin && <AdminRefunds />}
          {section === "my-payments" && role === "student" && <StudentPayments />}
          {section === "my-refunds" && role === "student" && <StudentRefunds />}
          {section === "trial-requests" && isAdmin && <AdminTrialRequests />}
          {section === "gradebook" && (role === "teacher" || isAdmin) && <GradebookView />}
          {section === "messages" && isAdmin && <AdminMessages />}
          {section === "profile" && <ProfileInline />}
        </main>
      </div>
    </div>
  );
}

/* ─── Sidebar ───────────────────────────────────────────── */

function SidebarContent({
  navItems,
  activeView,
  user,
  onSelect,
  onBackToSite,
}: {
  navItems: NavItem[];
  activeView: SectionId;
  user: User;
  onSelect: (v: SectionId) => void;
  onBackToSite: () => void;
}) {
  const t = useT();
  return (
    <div className="flex h-full flex-col">
      {/* Logo / brand */}
      <div className="flex items-center gap-2 border-b px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-extrabold leading-tight text-foreground">
            SHEEGOW
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t(ROLE_LABELS[user.role] || "dashboard.menu")}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("dashboard.menu")}
        </p>
        {navItems.map((item, idx) => {
          const active = activeView === item.id;
          return (
            <button
              key={`${item.id}-${idx}`}
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium transition-colors",
                active
                  ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-white" : "text-muted-foreground"
                )}
              />
              <span className="flex-1 text-left">{t(item.label)}</span>
              {active && (
                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile footer */}
      <Separator />
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.profilePicture || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-bold text-white">
              {user.fullName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {user.fullName}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {user.email}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px]", ROLE_BADGE_STYLES[user.role])}
          >
            {user.role}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onBackToSite}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("dashboard.backToSite")}
        </Button>
      </div>
    </div>
  );
}

/* ─── Admin Courses: overview + management ─────────────── */

function AdminCoursesSection() {
  const t = useT();
  const [tab, setTab] = useState<"overview" | "manage">("overview");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={tab === "overview" ? "default" : "outline"}
          aria-pressed={tab === "overview"}
          onClick={() => setTab("overview")}
          className={cn(
            "gap-1.5",
            tab === "overview" && "bg-indigo-600 hover:bg-indigo-700"
          )}
        >
          <LayoutDashboard className="h-4 w-4" /> {t("dashboard.overviewTab")}
        </Button>
        <Button
          size="sm"
          variant={tab === "manage" ? "default" : "outline"}
          aria-pressed={tab === "manage"}
          onClick={() => setTab("manage")}
          className={cn(
            "gap-1.5",
            tab === "manage" && "bg-indigo-600 hover:bg-indigo-700"
          )}
        >
          <BookOpen className="h-4 w-4" /> {t("dashboard.manageCoursesTab")}
        </Button>
      </div>
      {tab === "overview" ? <AdminCourseOverview /> : <AdminCourses />}
    </div>
  );
}

/* ─── Live class reminder banner ──────────────────────────
 * Polls /api/live/upcoming every 60 seconds while there's at least one class
 * starting within the next hour, and shows a prominent banner when a class is
 * about to start (within 15 minutes). Students only see classes whose course
 * they're enrolled in (or classes without a course); teachers/admins see all
 * upcoming classes.
 */
function LiveClassReminderBanner({ role }: { role: Role }) {
  const t = useT();
  const router = useRouter();
  const { user } = useStore();
  const [upcoming, setUpcoming] = useState<LiveClass[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(
    () => new Set()
  );
  const [now, setNow] = useState(() => Date.now());

  // Load upcoming live classes + the student's enrolled course ids once on
  // mount. The enrolled set lets us filter classes by course for students so
  // we never nag them about a class for a course they didn't buy.
  useEffect(() => {
    let active = true;
    const loadEnrollments =
      role === "student"
        ? api
            .myCourses()
            .then((r) => {
              if (!active) return;
              const ids = new Set<string>();
              for (const e of r.enrollments) {
                if (e.courseId) ids.add(e.courseId);
              }
              setEnrolledCourseIds(ids);
            })
            .catch(() => {
              /* silent — students without enrollments just see no banner */
            })
        : Promise.resolve();

    const loadClasses = () =>
      api
        .upcomingClasses()
        .then((r) => {
          if (active) setUpcoming(r.classes);
        })
        .catch(() => {
          /* silent — banner is best-effort, never blocks the dashboard */
        });

    void loadEnrollments.then(loadClasses).catch(() => undefined);
    loadClasses();
    return () => {
      active = false;
    };
  }, [role]);

  // Tick `now` every 60 seconds so the "starts in X minutes" stays accurate.
  // The interval runs continuously while mounted; the cost is trivial because
  // the only work done on each tick is a cheap state update.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Only consider classes that haven't ended and are scheduled within the
  // next hour. Students see only their enrolled classes; teachers/admins see
  // every class. A class with no course is shown to everyone (e.g. an open
  // orientation session).
  const isStaff = role === "teacher" || role === "admin" || role === "super_admin";
  const soonest = useMemo(() => {
    const ONE_HOUR = 60 * 60 * 1000;
    const candidates = upcoming.filter((lc) => {
      const start = new Date(lc.scheduledAt).getTime();
      const inWindow = start - now <= ONE_HOUR && start + lc.duration * 60_000 >= now;
      if (!inWindow) return false;
      if (isStaff) return true;
      // Student: must be enrolled in the class's course, or the class has no
      // course attached (open session).
      if (!lc.courseId) return true;
      return enrolledCourseIds.has(lc.courseId);
    });
    // Sort by soonest start; the banner shows the very next class.
    candidates.sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    return candidates[0] ?? null;
  }, [upcoming, now, isStaff, enrolledCourseIds]);

  if (!soonest || !user) return null;

  const start = new Date(soonest.scheduledAt).getTime();
  const minutesUntil = Math.round((start - now) / 60_000);

  // Banner appears only when the class is starting within 15 minutes (and
  // hasn't ended yet). Live classes (status === "live") are always shown.
  const isLive = soonest.status === "live";
  const within15 = minutesUntil <= 15 && minutesUntil >= -1;
  if (!isLive && !within15) return null;

  const label = isLive
    ? t("dashboard.classLiveNow")
    : minutesUntil <= 1
      ? t("dashboard.classStartingNow")
      : t("dashboard.classStartingSoon");

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
          <Clock className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold sm:text-base">
            {label}: {soonest.title}
          </p>
          <p className="mt-0.5 text-xs text-amber-800/90 sm:text-sm dark:text-amber-100/80">
            {isLive
              ? t("dashboard.classIsLive")
              : t("dashboard.startsInMinutes", {
                  count: Math.max(1, minutesUntil),
                })}
            {soonest.course?.title ? ` · ${soonest.course.title}` : ""}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => router.push(`/class/${soonest.id}`)}
        className="shrink-0 gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
      >
        <Video className="h-4 w-4" />
        {t("dashboard.joinNow")}
      </Button>
    </div>
  );
}

/* ─── Role-specific Overview ────────────────────────────── */

function RoleOverview({ role }: { role: Role }) {
  if (role === "student") return <StudentOverview />;
  if (role === "teacher") return <TeacherOverview />;
  return <AdminDashboard />;
}

/* ─── Student Overview ─────────────────────────────────── */

function StudentOverview() {
  const t = useT();
  const { user } = useStore();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [upcoming, setUpcoming] = useState<LiveClass[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof api.activity>>>({
    completedLessons: 0,
    watchedSeconds: 0,
    learningHours: 0,
    certificates: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .myCourses()
      .then((r) => active && setEnrollments(r.enrollments))
      .catch(() => active && setEnrollments([]))
      .finally(() => active && setLoading(false));
    api
      .upcomingClasses()
      .then((r) => {
        if (active) setUpcoming(r.classes.slice(0, 3));
      })
      .catch(() => active && setUpcoming([]));
    api
      .activity()
      .then((r) => active && setActivity(r))
      .catch(() => active && setActivity({
        completedLessons: 0,
        watchedSeconds: 0,
        learningHours: 0,
        certificates: 0,
      }));
    // Wishlist — silent failure so the dashboard never breaks if the API hiccups.
    api
      .wishlist()
      .then((r) => active && setWishlist(r.items))
      .catch(() => active && setWishlist([]));
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const activeCourses = enrollments.filter(
      (e) => e.status === "active"
    ).length;
    return {
      activeCourses,
      completedLessons: activity.completedLessons,
      learningHours: activity.learningHours,
      certificates: activity.certificates,
      wishlist: wishlist.length,
    };
  }, [enrollments, activity, wishlist]);

  const firstName = user?.fullName.split(" ")[0] || "Student";
  const today = formatDate(new Date().toISOString());

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t("dashboard.welcomeBack")} {firstName}!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.todayIs")} {today}. {t("dashboard.momentumMsg")}
          </p>
        </div>
        <Button onClick={() => router.push("/courses")} variant="outline" className="w-full gap-2 sm:w-auto">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          {t("dashboard.exploreCourses")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
        <StatCard icon={BookOpen} label={t("dashboard.activeCourses")} value={stats.activeCourses} color="bg-indigo-100 text-indigo-600" />
        <StatCard icon={CheckCircle2} label={t("dashboard.completedLessons")} value={stats.completedLessons} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={Clock} label={t("dashboard.learningHours")} value={`${stats.learningHours}h`} color="bg-amber-100 text-amber-600" />
        <StatCard icon={Award} label={t("dashboard.certificates")} value={stats.certificates} color="bg-violet-100 text-violet-600" />
        <button
          type="button"
          onClick={() => router.push("/wishlist")}
          className="text-left transition-transform hover:scale-[1.02] focus:outline-none"
          aria-label="Open your wishlist"
        >
          <StatCard icon={Heart} label={t("dashboard.wishlist")} value={stats.wishlist} color="bg-rose-100 text-rose-600" />
        </button>
      </div>

      {/* Gamification — points, streak, badges */}
      <GamificationWidget />

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="h-full p-0">
            <CardHeader className="flex-row items-center justify-between border-b">
              <div>
                <CardTitle className="text-lg">My Courses</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  {t("dashboard.pickUpLeft")}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3">
                      <Skeleton className="h-16 w-24 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : enrollments.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                    <BookOpen className="h-6 w-6 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">No courses yet</p>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.browseCatalog")}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => router.push("/courses")} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                    Browse Courses <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <ul className="divide-y">
                  {enrollments.slice(0, 4).map((enr) => {
                    const course = enr.course;
                    if (!course) return null;
                    return (
                      <li
                        key={enr.id}
                        className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center"
                      >
                        <button
                          onClick={() => router.push(`/learn/${course.id}`)}
                          className="relative h-16 w-full shrink-0 overflow-hidden rounded-lg sm:w-28"
                        >
                          {course.image ? (
                            <img loading="lazy" decoding="async"
                              src={course.image}
                              alt={course.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-indigo-100">
                              <PlayCircle className="h-6 w-6 text-indigo-400" />
                            </div>
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => router.push(`/learn/${course.id}`)}
                            className="block truncate text-left text-sm font-bold hover:text-indigo-600"
                          >
                            {course.title}
                          </button>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className={cn("border", levelBadgeClass(course.level))}>
                              {course.level}
                            </Badge>
                            <span>{course.duration}w</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={enr.progress} className="h-1.5" />
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {enr.progress}%
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/learn/${course.id}`)}
                          className="shrink-0 gap-1"
                        >
                          Continue <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming live classes */}
        <div>
          <Card className="h-full p-0">
            <CardHeader className="border-b">
              <CardTitle className="text-base">Upcoming Live Classes</CardTitle>
              <CardDescription className="text-xs">
                {t("dashboard.joinNextSession")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {upcoming.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                    <Calendar className="h-5 w-5 text-indigo-500" />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    No upcoming classes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.checkBackSoon")}
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {upcoming.map((lc) => (
                    <li key={lc.id} className="p-3">
                      <button
                        onClick={() => router.push(`/class/${lc.id}`)}
                        className="block w-full text-left"
                      >
                        <p className="truncate text-sm font-semibold hover:text-indigo-600">
                          {lc.title}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(lc.scheduledAt)}
                        </p>
                        {lc.status === "live" && (
                          <Badge className="mt-1.5 gap-1 bg-red-500 text-white">
                            <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-white" />
                            LIVE NOW
                          </Badge>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1 text-indigo-600"
                  onClick={() => router.push("/live-classes")}
                >
                  View all classes <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Wishlist mini-widget — saved-for-later courses, with a CTA to the
              full wishlist page. Hidden entirely when the student has none. */}
          <Card className="p-0">
            <CardHeader className="flex-row items-center justify-between border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                  <Heart className="h-4 w-4" />
                </span>
                {t("dashboard.wishlist")}
              </CardTitle>
              <Badge variant="secondary" className="font-semibold">
                {wishlist.length}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {wishlist.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50">
                    <Heart className="h-5 w-5 text-rose-400" />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    No saved courses yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.tapHeart")}
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {wishlist.slice(0, 4).map((item) => {
                    const course = item.course;
                    if (!course) return null;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => router.push(`/course/${course.id}`)}
                          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/40"
                        >
                          <div className="h-9 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                            {course.image ? (
                              <img
                                loading="lazy"
                                decoding="async"
                                src={course.image}
                                alt={course.title}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <p className="min-w-0 flex-1 truncate text-sm font-medium hover:text-indigo-600">
                            {course.title}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => router.push("/wishlist")}
                >
                  View wishlist <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Teacher Overview ──────────────────────────────────── */

function TeacherOverview() {
  const t = useT();
  const { user } = useStore();
  const router = useRouter();
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [upcoming, setUpcoming] = useState<LiveClass[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.teacherStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .teacherStats()
      .then((r) => active && setStats(r))
      .catch(() => active && setStats(null));
    // Get all courses and filter the ones this teacher teaches
    api
      .courses({ limit: 50 })
      .then((r) => {
        if (!active) return;
        setMyCourses(r.items.filter((c) => c.teacherId === user?.id));
      })
      .catch(() => active && setMyCourses([]));
    api
      .liveClasses()
      .then((r) => {
        if (!active) return;
        const list = (r as unknown as { items?: LiveClass[] }).items || r.classes;
        setUpcoming(
          (list || [])
            .filter((lc) => lc.teacherId === user?.id)
            .slice(0, 4)
        );
      })
      .catch(() => active && setUpcoming([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user]);

  const firstName = user?.fullName.split(" ")[0] || "Teacher";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t("dashboard.welcomeTeacher")} {firstName}!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.teacherOverview")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard icon={BookOpen} label={t("dashboard.myCourses")} value={stats?.courses ?? myCourses.length} color="bg-indigo-100 text-indigo-600" />
        <StatCard icon={Video} label={t("dashboard.upcomingClasses")} value={stats?.upcoming ?? upcoming.length} color="bg-rose-100 text-rose-600" />
        <StatCard icon={Users} label={t("dashboard.totalEnrollments")} value={stats?.enrollments ?? 0} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={Award} label={t("dashboard.avgRating")} value={stats?.averageRating != null ? stats.averageRating.toFixed(1) : "—"} color="bg-amber-100 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        {/* My teaching courses */}
        <div className="lg:col-span-2">
          <Card className="h-full p-0">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">My Courses</CardTitle>
              <CardDescription className="text-xs">
                {t("dashboard.coursesYouTeach")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : myCourses.length === 0 ? (
                <div className="py-12 text-center">
                  <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.noCoursesAssigned")}
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {myCourses.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                        {c.image && (
                          <img loading="lazy" decoding="async"
                            src={c.image}
                            alt={c.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <button
                        onClick={() => router.push(`/course/${c.id}`)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold hover:text-indigo-600">
                          {c.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className={cn("border", levelBadgeClass(c.level))}>
                            {c.level}
                          </Badge>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming live classes */}
        <div>
          <Card className="h-full p-0">
            <CardHeader className="border-b">
              <CardTitle className="text-base">My Live Classes</CardTitle>
              <CardDescription className="text-xs">
                {t("dashboard.sessionsYoullTeach")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {upcoming.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                    <Calendar className="h-5 w-5 text-indigo-500" />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    No upcoming classes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.yourScheduled")}
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {upcoming.map((lc) => (
                    <li key={lc.id} className="p-3">
                      <button
                        onClick={() => router.push(`/class/${lc.id}`)}
                        className="block w-full text-left"
                      >
                        <p className="truncate text-sm font-semibold hover:text-indigo-600">
                          {lc.title}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(lc.scheduledAt)}
                        </p>
                        {lc.status === "live" && (
                          <Badge className="mt-1.5 gap-1 bg-red-500 text-white">
                            <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-white" />
                            LIVE
                          </Badge>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Student: My Courses (full list within portal) ─────── */

function StudentMyCourses() {
  const t = useT();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .myCourses()
      .then((r) => active && setEnrollments(r.enrollments))
      .catch(() => active && setEnrollments([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <Card className="p-8 text-center">
        <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="font-semibold">No courses yet</p>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.browseCatalog")}
        </p>
        <Button
          onClick={() => router.push("/courses")}
          className="mt-4 gap-1.5 bg-indigo-600 hover:bg-indigo-700"
        >
          <BookOpen className="h-4 w-4" /> {t("dashboard.browseCourses")}
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {enrollments.map((enr) => {
        const c = enr.course;
        if (!c) return null;
        return (
          <Card key={enr.id} className="card-lift overflow-hidden p-0">
            <div className="aspect-[16/9] w-full overflow-hidden">
              {c.image ? (
                <img loading="lazy" decoding="async" src={c.image} alt={c.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-indigo-100">
                  <PlayCircle className="h-8 w-8 text-indigo-400" />
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="outline" className={cn("border", levelBadgeClass(c.level))}>
                  {c.level}
                </Badge>
                {enr.status === "completed" && (
                  <Badge className="bg-emerald-100 text-emerald-700">{t("dashboard.completedBadge")}</Badge>
                )}
              </div>
              <button
                onClick={() => router.push(`/learn/${c.id}`)}
                className="block text-left font-bold hover:text-indigo-600"
              >
                {c.title}
              </button>
              <div className="mt-2 flex items-center gap-2">
                <Progress value={enr.progress} className="h-1.5" />
                <span className="text-xs font-semibold text-muted-foreground">
                  {enr.progress}%
                </span>
              </div>
              <Button
                size="sm"
                className="mt-3 w-full gap-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => router.push(`/learn/${c.id}`)}
              >
                {t("dashboard.continueLearning")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ─── Teacher: My Students ──────────────────────────────── */

function TeacherStudents() {
  const t = useT();
  const { user } = useStore();
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .courses({ limit: 50 })
      .then((r) => {
        if (!active) return;
        setMyCourses(r.items.filter((c) => c.teacherId === user?.id));
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (myCourses.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="font-semibold">No students yet</p>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.studentsEnrolled")}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {myCourses.map((c) => (
        <Card key={c.id} className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold">{c.title}</p>
              <p className="text-xs text-muted-foreground">
                {c.level}
              </p>
            </div>
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
              {c.reviewCount} {t("dashboard.students")}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ─── Inline Profile (redirects to full profile view) ──── */

function ProfileInline() {
  const router = useRouter();
  const t = useT();
  // Delegate to the dedicated profile view
  useEffect(() => {
    router.push("/profile");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {t("dashboard.openingProfile")}
    </div>
  );
}

/* ─── Student Payments — payment history + invoice download ── */

function StudentPayments() {
  const t = useT();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refundByPaymentId, setRefundByPaymentId] = useState<
    Record<string, RefundRequest>
  >({});
  const [loading, setLoading] = useState(true);
  const [refundPaymentId, setRefundPaymentId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.paymentHistory().catch(() => ({ payments: [] as Payment[] })),
      api.refunds().catch(() => ({ refunds: [] as RefundRequest[] })),
    ])
      .then(([pRes, rRes]) => {
        if (!active) return;
        setPayments(pRes.payments);
        const map: Record<string, RefundRequest> = {};
        for (const r of rRes.refunds) {
          // Keep only the latest record per payment (the API returns them
          // sorted by createdAt desc, so the first one wins).
          if (!map[r.paymentId]) map[r.paymentId] = r;
        }
        setRefundByPaymentId(map);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  async function submitRefund() {
    if (!refundPaymentId) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Please describe why you are requesting a refund");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createRefund({ paymentId: refundPaymentId, reason: trimmed });
      setRefundByPaymentId((prev) => ({ ...prev, [refundPaymentId]: res.refund }));
      toast.success("Refund request submitted — we'll review it shortly");
      setRefundPaymentId(null);
      setReason("");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to submit refund request"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function refundBadge(r: RefundRequest | undefined) {
    if (!r) return null;
    if (r.status === "approved") {
      return (
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
          {t("dashboard.refundApproved")}
        </Badge>
      );
    }
    if (r.status === "rejected") {
      return (
        <Badge className="border-rose-200 bg-rose-50 text-rose-700">
          {t("dashboard.refundRejected")}
        </Badge>
      );
    }
    return (
      <Badge className="border-amber-200 bg-amber-50 text-amber-700">
        {t("dashboard.refundPending")}
      </Badge>
    );
  }

  function refundCell(p: Payment) {
    const refund = refundByPaymentId[p.id];
    // Already refunded (payment status flipped) — show the badge only.
    if (p.status === "refunded") {
      return (
        <Badge className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700">
          Refunded
        </Badge>
      );
    }
    if (p.status !== "completed") {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    if (refund && (refund.status === "pending" || refund.status === "approved")) {
      return refundBadge(refund);
    }
    // No active refund — show the request button (and offer re-request after
    // a previous rejection).
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setRefundPaymentId(p.id);
          setReason("");
        }}
        className="gap-1.5 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {t("dashboard.requestRefund")}
      </Button>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        <Card className="p-3 sm:p-4">
          <DollarSign className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {formatPrice(totalPaid)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.totalPaid")}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <CheckCircle2 className="mb-2 h-5 w-5 text-indigo-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {payments.filter((p) => p.status === "completed").length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.completed")}</p>
        </Card>
        <Card className="col-span-2 p-3 sm:p-4 md:col-span-1">
          <Clock className="mb-2 h-5 w-5 text-amber-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {payments.filter((p) => p.status === "pending").length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.pending")}</p>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("dashboard.paymentsDesc")}
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <Card className="p-10 text-center">
          <DollarSign className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-semibold">No payments yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.paymentsAppearHere")}
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {payments.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{formatPrice(p.amount)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.course?.title ?? t("dashboard.noCourse")}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("capitalize", studentStatusClass(p.status))}
                  >
                    {p.status}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDate(p.createdAt)}</span>
                  {p.status === "completed" && (
                    <a
                      href={`/invoice/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      <Download className="h-3.5 w-3.5" /> {t("dashboard.invoice")}
                    </a>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-end">
                  {refundCell(p)}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("dashboard.course")}</th>
                  <th className="px-4 py-3">{t("dashboard.amount")}</th>
                  <th className="px-4 py-3">{t("dashboard.method")}</th>
                  <th className="px-4 py-3">{t("dashboard.date")}</th>
                  <th className="px-4 py-3">{t("dashboard.status")}</th>
                  <th className="px-4 py-3">{t("dashboard.invoice")}</th>
                  <th className="px-4 py-3">{t("dashboard.refund")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="max-w-52 truncate px-4 py-3 font-medium">
                      {p.course?.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatPrice(p.amount)}
                    </td>
                    <td className="px-4 py-3 capitalize">{p.method}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn("capitalize", studentStatusClass(p.status))}
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "completed" ? (
                        <a
                          href={`/invoice/${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          <Download className="h-3.5 w-3.5" /> {t("dashboard.download")}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{refundCell(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Refund request dialog */}
      <Dialog
        open={refundPaymentId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRefundPaymentId(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a refund</DialogTitle>
            <DialogDescription>
              {t("dashboard.requestRefundDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="refund-reason"
              className="text-xs font-semibold text-muted-foreground"
            >
              {t("dashboard.reason")}
            </label>
            <Textarea
              id="refund-reason"
              placeholder="e.g. I was charged twice / the course didn&apos;t start / I enrolled by mistake..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              maxLength={2000}
              disabled={submitting}
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {reason.length}/2000
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRefundPaymentId(null);
                setReason("");
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitRefund}
              disabled={submitting || !reason.trim()}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function studentStatusClass(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "refunded":
      return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

/* ─── Stat Card helper ──────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
  color: string;
}) {
  const t = useT();
  return (
    <Card className="card-lift p-3 sm:p-5">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${color}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <p className="text-xl font-extrabold leading-none sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

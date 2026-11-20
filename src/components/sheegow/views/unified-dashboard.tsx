"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import type { Course, Enrollment, LiveClass, User } from "@/lib/types";
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
} from "lucide-react";
import { toast } from "sonner";

// Reuse existing admin sub-views
import { AdminDashboard } from "./admin/admin-dashboard";
import { AdminCourses } from "./admin/admin-courses";
import { AdminStudents } from "./admin/admin-students";
import { AdminLive } from "./admin/admin-live";
import { AdminTeachers } from "./admin/admin-teachers";
import { AdminMessages } from "./admin/admin-panel";

/* ─── Types ─────────────────────────────────────────────── */

type SectionId =
  | "overview"
  | "courses"
  | "students"
  | "live"
  | "teachers"
  | "messages"
  | "profile";

interface NavItem {
  id: SectionId;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Array<"student" | "teacher" | "admin">;
}

/* Role-aware navigation. Every role gets Overview, Courses, Live Classes,
   and Profile. Teachers can also see Students (their own). Admins see the
   full management suite (Students, Teachers, Messages). */
const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, roles: ["student", "teacher", "admin"] },
  { id: "courses", label: "My Courses", icon: BookOpen, roles: ["student"] },
  { id: "courses", label: "Manage Courses", icon: BookOpen, roles: ["teacher", "admin"] },
  { id: "live", label: "Live Classes", icon: Video, roles: ["student", "teacher", "admin"] },
  { id: "students", label: "My Students", icon: Users, roles: ["teacher"] },
  { id: "students", label: "Manage Students", icon: Users, roles: ["admin"] },
  { id: "teachers", label: "Teachers", icon: GraduationCap, roles: ["admin"] },
  { id: "messages", label: "Messages", icon: MessageSquare, roles: ["admin"] },
  { id: "profile", label: "Profile", icon: UserIcon, roles: ["student", "teacher", "admin"] },
];

const SECTION_TITLES: Record<SectionId, string> = {
  overview: "Dashboard Overview",
  courses: "Courses",
  students: "Students",
  live: "Live Classes",
  teachers: "Teachers",
  messages: "Contact Messages",
  profile: "Profile Settings",
};

const ROLE_LABELS: Record<string, string> = {
  student: "Student Portal",
  teacher: "Teacher Console",
  admin: "Admin Console",
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  student: "border-emerald-200 bg-emerald-50 text-emerald-700",
  teacher: "border-amber-200 bg-amber-50 text-amber-700",
  admin: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

/* ─── Main Unified Dashboard ─────────────────────────────── */

export function UnifiedDashboard() {
  const { user, authLoading, openAuthModal, navigate } = useStore();
  const [section, setSection] = useState<SectionId>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Auth gate — every role must be logged in
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm">Loading your dashboard...</p>
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
          <h2 className="mb-2 text-xl font-bold">Please log in</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Log in to access your dashboard — students, teachers, and admins
            all start here.
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

  const role = user.role as "student" | "teacher" | "admin";
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
      onBackToSite={() => navigate("home")}
    />
  );

  return (
    <div className="flex bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r bg-card lg:flex lg:flex-col">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-16 z-30 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-foreground sm:text-lg">
                {activeTitle}
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {ROLE_LABELS[role]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("home")}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to site</span>
              <span className="sm:hidden">Exit</span>
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
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSection("overview")}>
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard Overview
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("home")}>
                  <ArrowLeft className="h-4 w-4" />
                  Back to site
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content area — renders role-appropriate content */}
        <main className="flex-1 p-4 sm:p-6">
          {section === "overview" && <RoleOverview role={role} />}
          {section === "courses" && role === "student" && <StudentMyCourses />}
          {section === "courses" && (role === "teacher" || role === "admin") && (
            <AdminCourses />
          )}
          {section === "students" && role === "teacher" && <TeacherStudents />}
          {section === "students" && role === "admin" && <AdminStudents />}
          {section === "live" && <AdminLive />}
          {section === "teachers" && role === "admin" && <AdminTeachers />}
          {section === "messages" && role === "admin" && <AdminMessages />}
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
  return (
    <div className="flex h-full flex-col">
      {/* Logo / brand */}
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-extrabold leading-tight text-foreground">
            SHEEGOW
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {ROLE_LABELS[user.role] || "Portal"}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Menu
        </p>
        {navItems.map((item, idx) => {
          const active = activeView === item.id;
          return (
            <button
              key={`${item.id}-${idx}`}
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-white" : "text-muted-foreground"
                )}
              />
              <span className="flex-1 text-left">{item.label}</span>
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
          Back to site
        </Button>
      </div>
    </div>
  );
}

/* ─── Role-specific Overview ────────────────────────────── */

function RoleOverview({ role }: { role: "student" | "teacher" | "admin" }) {
  if (role === "student") return <StudentOverview />;
  if (role === "teacher") return <TeacherOverview />;
  return <AdminDashboard />;
}

/* ─── Student Overview ─────────────────────────────────── */

function StudentOverview() {
  const { user, navigate, openCourse, openClass } = useStore();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [upcoming, setUpcoming] = useState<LiveClass[]>([]);
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
        if (!active) return;
        const list = (r as unknown as { items?: LiveClass[] }).items;
        setUpcoming(list ? list.slice(0, 3) : []);
      })
      .catch(() => active && setUpcoming([]));
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const activeCourses = enrollments.filter(
      (e) => e.status === "active"
    ).length;
    const completedLessons = enrollments.reduce((sum, e) => {
      if (e.completedLessons) {
        const parsed = String(e.completedLessons).split(",").filter(Boolean)
          .length;
        if (parsed > 0) return sum + parsed;
      }
      return sum + Math.round((e.progress || 0) / 10);
    }, 0);
    const learningHours = enrollments.length * 2;
    const certificates = enrollments.filter(
      (e) => e.status === "completed"
    ).length;
    return { activeCourses, completedLessons, learningHours, certificates };
  }, [enrollments]);

  const firstName = user?.fullName.split(" ")[0] || "Student";
  const today = formatDate(new Date().toISOString());

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Welcome back, {firstName}!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Today is {today}. Keep up the momentum — every lesson brings you
            closer to fluency.
          </p>
        </div>
        <Button onClick={() => navigate("courses")} variant="outline" className="w-full gap-2 sm:w-auto">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          Explore courses
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Active Courses" value={stats.activeCourses} color="bg-indigo-100 text-indigo-600" />
        <StatCard icon={CheckCircle2} label="Completed Lessons" value={stats.completedLessons} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={Clock} label="Learning Hours" value={`${stats.learningHours}h`} color="bg-amber-100 text-amber-600" />
        <StatCard icon={Award} label="Certificates" value={stats.certificates} color="bg-violet-100 text-violet-600" />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="h-full p-0">
            <CardHeader className="flex-row items-center justify-between border-b">
              <div>
                <CardTitle className="text-lg">My Courses</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Pick up where you left off
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
                      Browse our catalog to start learning.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => navigate("courses")} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
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
                          onClick={() => openCourse(course.id)}
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
                            onClick={() => openCourse(course.id)}
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
                          onClick={() => openCourse(course.id)}
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
                Join the next session
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
                    Check back soon for new sessions.
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {upcoming.map((lc) => (
                    <li key={lc.id} className="p-3">
                      <button
                        onClick={() => openClass(lc.id)}
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
                  onClick={() => navigate("live")}
                >
                  View all classes <ArrowRight className="h-3.5 w-3.5" />
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
  const { user, openClass, openCourse } = useStore();
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [upcoming, setUpcoming] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
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
          Welcome, {firstName}!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s an overview of your teaching activity at SHEEGOW ACADEMY.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="My Courses" value={myCourses.length} color="bg-indigo-100 text-indigo-600" />
        <StatCard icon={Video} label="Upcoming Classes" value={upcoming.length} color="bg-rose-100 text-rose-600" />
        <StatCard icon={Users} label="Total Enrollments" value={myCourses.reduce((s, c) => s + (c.reviewCount || 0), 0)} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={Award} label="Avg Rating" value={myCourses.length ? (myCourses.reduce((s, c) => s + c.rating, 0) / myCourses.length).toFixed(1) : "—"} color="bg-amber-100 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        {/* My teaching courses */}
        <div className="lg:col-span-2">
          <Card className="h-full p-0">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">My Courses</CardTitle>
              <CardDescription className="text-xs">
                Courses you teach
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
                    No courses assigned to you yet.
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
                        onClick={() => openCourse(c.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold hover:text-indigo-600">
                          {c.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className={cn("border", levelBadgeClass(c.level))}>
                            {c.level}
                          </Badge>
                          <span>{formatPrice(c.price)}</span>
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
                Sessions you&apos;ll teach
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
                    Your scheduled sessions will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {upcoming.map((lc) => (
                    <li key={lc.id} className="p-3">
                      <button
                        onClick={() => openClass(lc.id)}
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
  const { openCourse, navigate } = useStore();
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
          Browse the catalog to enroll in your first course.
        </p>
        <Button
          onClick={() => navigate("courses")}
          className="mt-4 gap-1.5 bg-indigo-600 hover:bg-indigo-700"
        >
          <BookOpen className="h-4 w-4" /> Browse Courses
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
                  <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>
                )}
              </div>
              <button
                onClick={() => openCourse(c.id)}
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
                onClick={() => openCourse(c.id)}
              >
                Continue Learning <ArrowRight className="h-3.5 w-3.5" />
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
          Students enrolled in your courses will appear here.
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
                {c.level} • {formatPrice(c.price)}
              </p>
            </div>
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
              {c.reviewCount} students
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ─── Inline Profile (redirects to full profile view) ──── */

function ProfileInline() {
  const { navigate } = useStore();
  // Delegate to the dedicated profile view
  useEffect(() => {
    navigate("profile");
  }, [navigate]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Opening profile settings...
    </div>
  );
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

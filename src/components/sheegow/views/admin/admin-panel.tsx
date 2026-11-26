"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import {
  cn,
  formatDate,
  formatDateTime,
} from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ShieldAlert,
  LogIn,
  Loader2,
  Mail,
  Phone,
  MoreVertical,
  MailOpen,
  CheckCircle2,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { AdminDashboard } from "./admin-dashboard";
import { AdminCourses } from "./admin-courses";
import { AdminStudents } from "./admin-students";
import { AdminLive } from "./admin-live";
import { AdminTeachers } from "./admin-teachers";
import { AdminBundles } from "./admin-bundles";

type AdminView =
  | "dashboard"
  | "courses"
  | "bundles"
  | "students"
  | "live"
  | "teachers"
  | "messages";

interface NavItem {
  id: AdminView;
  labelKey: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", labelKey: "admin.nav.dashboard", icon: LayoutDashboard },
  { id: "courses", labelKey: "admin.nav.courses", icon: BookOpen },
  { id: "bundles", labelKey: "admin.nav.bundles", icon: Package },
  { id: "students", labelKey: "admin.nav.students", icon: Users },
  { id: "live", labelKey: "admin.nav.live", icon: Video },
  { id: "teachers", labelKey: "admin.nav.teachers", icon: GraduationCap },
  { id: "messages", labelKey: "admin.nav.messages", icon: MessageSquare },
];

const VIEW_TITLES: Record<AdminView, string> = {
  dashboard: "admin.viewTitles.dashboard",
  courses: "admin.viewTitles.courses",
  bundles: "admin.viewTitles.bundles",
  students: "admin.viewTitles.students",
  live: "admin.viewTitles.live",
  teachers: "admin.viewTitles.teachers",
  messages: "admin.viewTitles.messages",
};

/**
 * Single-admin app: admins have full admin panel access. Teachers get teaching
 * views only.
 */
function allowedViewsFor(role: string): Set<AdminView> {
  if (role === "admin" || role === "super_admin")
    return new Set(NAV_ITEMS.map((n) => n.id));
  return new Set<AdminView>(["dashboard", "courses", "live"]);
}

export function AdminPanel() {
  const t = useT();
  const { user, authLoading, openAuthModal } = useStore();
  const router = useRouter();
  const [adminView, setAdminView] = useState<AdminView>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Auth guard
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="text-sm">{t("admin.panel.loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
            <LogIn className="h-6 w-6 text-indigo-600" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-foreground">
            {t("admin.panel.pleaseLogin")}
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {t("admin.panel.loginDesc")}
          </p>
          <Button
            onClick={() => openAuthModal("login")}
            className="gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700"
          >
            <LogIn className="h-4 w-4" />
            {t("admin.panel.login")}
          </Button>
        </Card>
      </div>
    );
  }

  if (
    user.role !== "admin" &&
    user.role !== "super_admin" &&
    user.role !== "teacher"
  ) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <ShieldAlert className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-foreground">
            {t("admin.panel.accessDenied")}
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {t("admin.panel.accessDeniedDesc")}
          </p>
          <Button variant="outline" onClick={() => router.push("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("admin.panel.backToSite")}
          </Button>
        </Card>
      </div>
    );
  }

  const allowedViews = allowedViewsFor(user.role);
  // Defence in depth: never render a view the current role is not allowed to
  // see, even if state was manipulated some other way.
  const safeView: AdminView = allowedViews.has(adminView) ? adminView : "dashboard";
  const navItems = NAV_ITEMS.filter((item) => allowedViews.has(item.id));
  const activeTitle = t(VIEW_TITLES[safeView]);

  const sidebar = (
    <SidebarContent
      items={navItems}
      activeView={safeView}
      onSelect={(v) => {
        if (!allowedViews.has(v)) return;
        setAdminView(v);
        setMobileNavOpen(false);
      }}
    />
  );

  return (
    <div className="flex bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 border-r bg-card lg:flex lg:flex-col xl:w-80">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
          <SheetTitle className="sr-only">{t("admin.panel.adminNav")}</SheetTitle>
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
              <span className="sr-only">{t("admin.panel.openNav")}</span>
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-foreground sm:text-lg">
                {activeTitle}
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {t("admin.panel.adminSubtitle")}
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
              <span className="hidden sm:inline">{t("admin.panel.backToSite")}</span>
              <span className="sm:hidden">{t("admin.panel.exit")}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full border p-1 pr-2 transition-colors hover:bg-accent"
                  aria-label={t("admin.panel.openProfileMenu")}
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
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  <Users className="h-4 w-4" />
                  {t("admin.panel.myProfile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                  <LayoutDashboard className="h-4 w-4" />
                  {t("admin.panel.studentDashboard")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/")}>
                  <ArrowLeft className="h-4 w-4" />
                  {t("admin.panel.backToSite")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 p-4 sm:p-6">
          {safeView === "dashboard" && <AdminDashboard />}
          {safeView === "courses" && <AdminCourses />}
          {safeView === "bundles" && <AdminBundles />}
          {safeView === "students" && <AdminStudents />}
          {safeView === "live" && <AdminLive />}
          {safeView === "teachers" && <AdminTeachers />}
          {safeView === "messages" && <AdminMessages />}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  items,
  activeView,
  onSelect,
}: {
  items: NavItem[];
  activeView: AdminView;
  onSelect: (v: AdminView) => void;
}) {
  const t = useT();
  const { user } = useStore();
  const router = useRouter();

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
            {t("admin.panel.adminConsole")}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("admin.panel.management")}
        </p>
        {items.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
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
              <span className="flex-1 text-left">{t(item.labelKey)}</span>
              {active && (
                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin profile footer */}
      {user && (
        <>
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
                className="border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700"
              >
                {user.role}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("admin.panel.backToSite")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Contact Messages (inline sub-view) ──────────────────────────

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  resolved: boolean;
  createdAt: string;
}

export function AdminMessages() {
  const t = useT();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  async function fetchMessages() {
    setLoading(true);
    try {
      const r = await api.contactMessages();
      setMessages(r.messages as ContactMessage[]);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("admin.messages.loadFailed");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMessages();
  }, []);

  const unreadCount = useMemo(
    () => messages.filter((m) => !m.resolved).length,
    [messages]
  );

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="p-3 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:h-10 sm:w-10">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-foreground sm:text-2xl">
                {messages.length}
              </p>
              <p className="text-xs text-muted-foreground">{t("admin.messages.totalMessages")}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 sm:h-10 sm:w-10">
              <MailOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-foreground sm:text-2xl">
                {unreadCount}
              </p>
              <p className="text-xs text-muted-foreground">{t("admin.messages.awaitingReply")}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:h-10 sm:w-10">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-foreground sm:text-2xl">
                {messages.length - unreadCount}
              </p>
              <p className="text-xs text-muted-foreground">{t("admin.messages.resolved")}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {t("admin.messages.noMessages")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("admin.messages.noMessagesDesc")}
            </p>
          </div>
        ) : (
          <div className="-mx-3 overflow-x-auto sm:mx-0">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px] pl-4">{t("admin.messages.colFrom")}</TableHead>
                  <TableHead className="min-w-[220px]">{t("admin.messages.colSubject")}</TableHead>
                  <TableHead className="hidden min-w-[140px] md:table-cell">{t("admin.messages.colReceived")}</TableHead>
                  <TableHead className="min-w-[100px]">{t("admin.messages.colStatus")}</TableHead>
                  <TableHead className="pr-4 text-right">{t("admin.messages.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {messages.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="pl-4">
                    <div>
                      <p className="font-semibold text-foreground">{m.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{m.email}</span>
                      </div>
                      {m.phone && (
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{m.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="truncate font-medium text-foreground">
                      {m.subject}
                    </p>
                    <p className="line-clamp-1 max-w-md text-xs text-muted-foreground">
                      {m.message}
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    <div className="flex flex-col gap-0.5">
                      <span>{formatDateTime(m.createdAt)}</span>
                      <span className="text-[10px]">
                        {formatDate(m.createdAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        m.resolved
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }
                    >
                      {m.resolved ? t("admin.messages.resolvedBadge") : t("admin.messages.openBadge")}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">
                            {t("admin.messages.openActions")}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setOpenId(m.id)}>
                          <MailOpen className="h-4 w-4" />
                          {t("admin.messages.readMessage")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const subject = encodeURIComponent(
                              `RE: ${m.subject}`
                            );
                            const body = encodeURIComponent(
                              `${t("admin.messages.replyGreeting", { name: m.name })}\n\n${t("admin.messages.replyBody")}\n\n`
                            );
                            window.location.href = `mailto:${m.email}?subject=${subject}&body=${body}`;
                          }}
                        >
                          <Mail className="h-4 w-4" />
                          {t("admin.messages.replyByEmail")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              await api.updateUser(m.id, {});
                              toast.success(t("admin.messages.alreadyUpToDateToast"));
                            } catch {
                              // no dedicated endpoint — just toggle locally
                              setMessages((prev) =>
                                prev.map((x) =>
                                  x.id === m.id
                                    ? { ...x, resolved: !x.resolved }
                                    : x
                                )
                              );
                              toast.success(
                                m.resolved
                                  ? t("admin.messages.markedOpenToast")
                                  : t("admin.messages.markedResolvedToast")
                              );
                            }
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {m.resolved ? t("admin.messages.markAsOpen") : t("admin.messages.markResolved")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </Card>

      {/* Read dialog */}
      {openId && (
        <ReadMessageDialog
          message={messages.find((m) => m.id === openId) ?? null}
          onClose={() => setOpenId(null)}
          onReply={(email, subject, name) => {
            const subj = encodeURIComponent(`RE: ${subject}`);
            const body = encodeURIComponent(
              `${t("admin.messages.replyGreeting", { name })}\n\n${t("admin.messages.replyBody")}\n\n`
            );
            window.location.href = `mailto:${email}?subject=${subj}&body=${body}`;
          }}
        />
      )}
    </div>
  );
}

function ReadMessageDialog({
  message,
  onClose,
  onReply,
}: {
  message: ContactMessage | null;
  onClose: () => void;
  onReply: (email: string, subject: string, name: string) => void;
}) {
  const t = useT();
  if (!message) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <Card
        className="relative my-8 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {message.subject}
            </h3>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(message.createdAt)}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              message.resolved
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }
          >
            {message.resolved ? t("admin.messages.resolvedBadge") : t("admin.messages.openBadge")}
          </Badge>
        </div>
        <Separator className="mb-4" />
        <div className="mb-4 space-y-1.5 text-sm">
          <p>
            <span className="font-semibold text-foreground">{t("admin.messages.fromLabel")}</span>{" "}
            <span className="text-foreground">{message.name}</span>
          </p>
          <p>
            <span className="font-semibold text-foreground">{t("admin.messages.emailLabel")}</span>{" "}
            <span className="text-muted-foreground">{message.email}</span>
          </p>
          {message.phone && (
            <p>
              <span className="font-semibold text-foreground">{t("admin.messages.phoneLabel")}</span>{" "}
              <span className="text-muted-foreground">{message.phone}</span>
            </p>
          )}
        </div>
        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            {t("admin.messages.messageLabel")}
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
            {message.message}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            {t("admin.messages.close")}
          </Button>
          <Button
            onClick={() =>
              onReply(message.email, message.subject, message.name)
            }
            className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 sm:w-auto"
          >
            <Mail className="h-4 w-4" />
            {t("admin.messages.reply")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

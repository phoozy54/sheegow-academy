"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import { isValidSomaliPhone, normalizeSomaliPhone } from "@/lib/phone";
import { PhoneInput } from "../phone-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Camera,
  Mail,
  User,
  Phone,
  Lock,
  Bell,
  Trash2,
  Shield,
  Check,
  Loader2,
  LogIn,
  Save,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { levelBadgeClass } from "@/lib/ui";
import { useT } from "@/lib/i18n";

const LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "IELTS",
  "Kids",
] as const;

export function ProfileView() {
  const t = useT();
  const { user, authLoading, openAuthModal, setUser } = useStore();
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Account form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState<string>("Beginner");

  // Password form
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Notifications (cosmetic)
  const [liveReminders, setLiveReminders] = useState(true);
  const [courseAnnouncements, setCourseAnnouncements] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);

  // Danger zone
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName || "");
    setEmail(user.email || "");
    setUsername(user.username || "");
    setPhone(normalizeSomaliPhone(user.phone || ""));
    setLevel(user.level || "Beginner");
  }, [user]);

  // ─── Auth gate ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm">{t("profile.loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <LogIn className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="mb-2 text-xl font-bold">{t("profile.pleaseLogin")}</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {t("profile.loginToManage")}
          </p>
          <Button
            onClick={() => openAuthModal("login")}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
          >
            Log in
          </Button>
        </Card>
      </div>
    );
  }

  const handleSaveAccount = async () => {
    if (!fullName.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }
    if (phone && !isValidSomaliPhone(phone)) {
      toast.error("Enter a Somali number starting with 61, 63 or 65.");
      return;
    }
    setSavingAccount(true);
    try {
      const body: Record<string, string> = {
        fullName: fullName.trim(),
      };
      // Only students have a learning level — don't send it for
      // teachers/admins (the API would reject it anyway).
      if (user.role === "student") {
        body.level = level;
      }
      if (
        username.trim() &&
        username.trim() !== (user.username || "")
      ) {
        body.username = username.trim();
      }
      if (phone !== (user.phone || "")) body.phone = phone;
      const { user: updated } = await api.updateMyProfile(body);
      setUser(updated);
      toast.success("Profile updated successfully");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not update profile";
      toast.error(msg);
    } finally {
      setSavingAccount(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPw) {
      toast.error("Please enter your current password");
      return;
    }
    if (newPw.length < 12) {
      toast.error("New password must be at least 12 characters");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword({
        currentPassword: currentPw,
        newPassword: newPw,
      });
      toast.success("Password updated successfully");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not update password";
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePhotoUpload = () => {
    toast.info("Photo upload is demo only");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("profile.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("profile.desc")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Left: profile card ────────────────────────────── */}
        <Card className="card-lift p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar className="h-28 w-28 border-4 border-white shadow-lg">
                <AvatarImage src={user.profilePicture || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-2xl font-extrabold text-white">
                  {user.fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handlePhotoUpload}
                aria-label={t("profile.changePhoto")}
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow-md transition-transform hover:scale-110 hover:bg-emerald-700"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <h2 className="mt-4 text-lg font-extrabold text-foreground">
              {user.fullName}
            </h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Badge className="bg-emerald-100 capitalize text-emerald-700">
                {user.role}
              </Badge>
              {/* Learning level badge — only for students */}
              {user.role === "student" && (
                <Badge
                  variant="outline"
                  className={`border ${levelBadgeClass(user.level)}`}
                >
                  {user.level || "Beginner"}
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePhotoUpload}
              className="mt-5 w-full gap-1.5"
            >
              <Camera className="h-4 w-4" />
              Change Photo
            </Button>

            <Separator className="my-5" />

            <dl className="w-full space-y-2 text-left text-sm">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" /> {t("profile.username")}
                </dt>
                <dd className="max-w-[140px] truncate font-medium">
                  {user.username || t("profile.notSet")}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {t("profile.email")}
                </dt>
                <dd className="max-w-[140px] truncate font-medium">
                  {user.email}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {t("profile.phone")}
                </dt>
                <dd className="font-medium">
                  {user.phone || t("profile.notSet")}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        {/* ─── Right: settings tabs ──────────────────────────── */}
        <Card className="p-0 lg:col-span-2">
          <Tabs defaultValue="account" className="flex h-full flex-col">
            <CardHeader className="border-b p-0 pb-0">
              <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-2">
                <TabsTrigger
                  value="account"
                  className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
                >
                  {t("profile.account")}
                </TabsTrigger>
                <TabsTrigger
                  value="password"
                  className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
                >
                  {t("profile.password")}
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
                >
                  {t("profile.notifications")}
                </TabsTrigger>
                <TabsTrigger
                  value="danger"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700"
                >
                  {t("profile.dangerZone")}
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            {/* Account */}
            <TabsContent value="account" className="m-0 flex-1 p-6">
              <div className="mb-5">
                <h3 className="text-base font-bold">{t("profile.accountInfo")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("profile.accountInfoDesc")}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fullName">{t("profile.fullName")}</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="username">{t("profile.loginUsername")}</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ahmed.hassan"
                    minLength={3}
                    maxLength={30}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t("profile.usernameHint")}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("profile.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted/40 text-muted-foreground"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t("profile.emailCannotChange")}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("profile.phone")}</Label>
                  <PhoneInput id="phone" value={phone} onChange={setPhone} />
                </div>

                {/* Learning level — only for students. Teachers and admins
                    are not learners, so this field is irrelevant for them. */}
                {user.role === "student" && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="level">{t("profile.learningLevel")}</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger id="level" className="w-full">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((lv) => (
                          <SelectItem key={lv} value={lv}>
                            {lv}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSaveAccount}
                  disabled={savingAccount}
                  className="gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                >
                  {savingAccount ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            {/* Password */}
            <TabsContent value="password" className="m-0 flex-1 p-6">
              <div className="mb-5">
                <h3 className="text-base font-bold">{t("profile.changePassword")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("profile.passwordDesc")}
                </p>
              </div>
              <div className="max-w-md space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPw">{t("profile.currentPassword")}</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="currentPw"
                      type="password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPw">{t("profile.newPassword")}</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="newPw"
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="At least 12 characters"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPw">{t("profile.confirmNewPassword")}</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPw"
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Re-enter new password"
                      className="pl-9"
                    />
                  </div>
                  {confirmPw.length > 0 && newPw !== confirmPw && (
                    <p className="text-[11px] text-red-600">
                      {t("profile.passwordsNoMatch")}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleUpdatePassword}
                    disabled={savingPassword}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {savingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Update Password
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications" className="m-0 flex-1 p-6">
              <div className="mb-5">
                <h3 className="text-base font-bold">Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  {t("profile.notificationsDesc")}
                </p>
              </div>
              <div className="space-y-1">
                <NotifRow
                  icon={Bell}
                  title={t("profile.liveReminders")}
                  desc={t("profile.liveRemindersDesc")}
                  checked={liveReminders}
                  onCheckedChange={(v) => {
                    setLiveReminders(v);
                    toast.success(
                      `Live class reminders ${v ? "enabled" : "disabled"}`
                    );
                  }}
                />
                <Separator />
                <NotifRow
                  icon={Check}
                  title={t("profile.courseAnnouncements")}
                  desc={t("profile.courseAnnouncementsDesc")}
                  checked={courseAnnouncements}
                  onCheckedChange={(v) => {
                    setCourseAnnouncements(v);
                    toast.success(
                      `Course announcements ${v ? "enabled" : "disabled"}`
                    );
                  }}
                />
                <Separator />
                <NotifRow
                  icon={Mail}
                  title={t("profile.weeklyReports")}
                  desc={t("profile.weeklyReportsDesc")}
                  checked={weeklyReports}
                  onCheckedChange={(v) => {
                    setWeeklyReports(v);
                    toast.success(
                      `Weekly reports ${v ? "enabled" : "disabled"}`
                    );
                  }}
                />
              </div>
            </TabsContent>

            {/* Danger zone */}
            <TabsContent value="danger" className="m-0 flex-1 p-6">
              <div className="mb-5">
                <h3 className="flex items-center gap-2 text-base font-bold text-red-700">
                  <AlertTriangle className="h-4 w-4" /> {t("profile.dangerZone")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("profile.dangerZoneDesc")}
                </p>
              </div>

              <div className="flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("profile.deleteAccount")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.deleteAccountDesc")}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                  className="gap-1.5 sm:shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete account
                </Button>
              </div>

              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-5 w-5" />
                      {t("profile.deleteAccountTitle")}
                    </DialogTitle>
                    <DialogDescription>
                      {t("profile.deleteAccountConfirm")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <Shield className="mb-1 inline h-4 w-4" /> Account deletion
                    is disabled in this demo environment.
                  </div>
                  <DialogFooter className="gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteOpen(false)}
                      className="sm:flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDeleteOpen(false);
                        toast.error(
                          "Account deletion is disabled in demo"
                        );
                      }}
                      className="sm:flex-1"
                    >
                      I understand, delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function NotifRow({
  icon: Icon,
  title,
  desc,
  checked,
  onCheckedChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={(v) => onCheckedChange(!!v)} />
    </div>
  );
}

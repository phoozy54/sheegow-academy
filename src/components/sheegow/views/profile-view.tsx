"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
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

const LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "IELTS",
  "Kids",
] as const;

export function ProfileView() {
  const { user, authLoading, openAuthModal, setUser } = useStore();
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Account form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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
    setPhone(user.phone || "");
    setLevel(user.level || "Beginner");
  }, [user]);

  // ─── Auth gate ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm">Loading your profile...</p>
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
            Log in to manage your profile settings.
          </p>
          <Button
            onClick={() => openAuthModal("login")}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
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
    setSavingAccount(true);
    try {
      const body: Record<string, string> = {
        fullName: fullName.trim(),
        level,
      };
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
          Profile Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, password, and notification preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Left: profile card ────────────────────────────── */}
        <Card className="card-lift p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar className="h-28 w-28 border-4 border-white shadow-lg">
                <AvatarImage src={user.profilePicture || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-2xl font-extrabold text-white">
                  {user.fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handlePhotoUpload}
                aria-label="Change photo"
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow-md transition-transform hover:scale-110 hover:bg-indigo-700"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <h2 className="mt-4 text-lg font-extrabold text-foreground">
              {user.fullName}
            </h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Badge className="bg-indigo-100 capitalize text-indigo-700">
                {user.role}
              </Badge>
              <Badge
                variant="outline"
                className={`border ${levelBadgeClass(user.level)}`}
              >
                {user.level || "Beginner"}
              </Badge>
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
                  <Mail className="h-4 w-4" /> Email
                </dt>
                <dd className="max-w-[140px] truncate font-medium">
                  {user.email}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> Phone
                </dt>
                <dd className="font-medium">
                  {user.phone || "Not set"}
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
                  className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
                >
                  Account
                </TabsTrigger>
                <TabsTrigger
                  value="password"
                  className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
                >
                  Password
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
                >
                  Notifications
                </TabsTrigger>
                <TabsTrigger
                  value="danger"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700"
                >
                  Danger Zone
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            {/* Account */}
            <TabsContent value="account" className="m-0 flex-1 p-6">
              <div className="mb-5">
                <h3 className="text-base font-bold">Account information</h3>
                <p className="text-sm text-muted-foreground">
                  Update your personal details and learning level.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted/40 text-muted-foreground"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+252 63 4085151"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="level">Learning Level</Label>
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
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSaveAccount}
                  disabled={savingAccount}
                  className="gap-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
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
                <h3 className="text-base font-bold">Change password</h3>
                <p className="text-sm text-muted-foreground">
                  Keep your account secure with a strong password.
                </p>
              </div>
              <div className="max-w-md space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPw">Current Password</Label>
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
                  <Label htmlFor="newPw">New Password</Label>
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
                  <Label htmlFor="confirmPw">Confirm New Password</Label>
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
                      Passwords do not match
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleUpdatePassword}
                    disabled={savingPassword}
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
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
                  Choose what updates you want to receive.
                </p>
              </div>
              <div className="space-y-1">
                <NotifRow
                  icon={Bell}
                  title="Live class reminders"
                  desc="Get notified 15 minutes before your scheduled classes."
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
                  title="New course announcements"
                  desc="Hear about new courses that match your level."
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
                  title="Weekly progress reports"
                  desc="A weekly summary of your learning progress by email."
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
                  <AlertTriangle className="h-4 w-4" /> Danger Zone
                </h3>
                <p className="text-sm text-muted-foreground">
                  Irreversible actions for your account.
                </p>
              </div>

              <div className="flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Delete account
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permanently remove your account and all associated data.
                    This cannot be undone.
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
                      Delete account?
                    </DialogTitle>
                    <DialogDescription>
                      This will permanently delete your account, enrollments,
                      and progress. This action cannot be undone.
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

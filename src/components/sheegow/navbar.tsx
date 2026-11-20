"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useDevice } from "@/lib/device";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menu,
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  User as UserIcon,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { AuthModal } from "./auth-modal";

type View =
  | "home"
  | "courses"
  | "course-detail"
  | "live"
  | "live-room"
  | "about"
  | "contact"
  | "login"
  | "register"
  | "dashboard"
  | "my-courses"
  | "profile"
  | "checkout"
  | "admin"
  | "admin-courses"
  | "admin-students"
  | "admin-live"
  | "admin-teachers";

const NAV_LINKS: { label: string; view: View }[] = [
  { label: "Home", view: "home" },
  { label: "Courses", view: "courses" },
  { label: "Live Classes", view: "live" },
  { label: "About", view: "about" },
  { label: "Contact", view: "contact" },
];

export function Navbar() {
  const {
    view,
    navigate,
    user,
    setUser,
    authLoading,
    setAuthLoading,
    mobileMenuOpen,
    setMobileMenuOpen,
    openAuthModal,
  } = useStore();
  const { isMobile, isTablet } = useDevice();

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, [setUser, setAuthLoading]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setUser(null);
    navigate("home");
  };

  const go = (v: View) => navigate(v);

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
          scrolled
            ? "bg-background/85 backdrop-blur-lg shadow-sm"
            : "bg-background/60 backdrop-blur-md"
        }`}
      >
        <div
          className={`mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 sm:gap-4 ${
            isMobile ? "px-3" : isTablet ? "px-5" : "px-8"
          }`}
        >
          <button
            onClick={() => go("home")}
            className="flex shrink-0 items-center gap-2.5 transition-transform hover:scale-105 sm:gap-2.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/30">
              <GraduationCap className="h-6 w-6" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-tight text-foreground">
                SHEEGOW
              </span>
              <span className="text-[10px] font-semibold tracking-[0.2em] text-indigo-500">
                ACADEMY
              </span>
            </span>
          </button>

          <nav
            className={`hidden items-center md:flex ${isTablet ? "gap-0.5" : "gap-1"}`}
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link.view}
                onClick={() => go(link.view)}
                className={`relative rounded-lg py-2 font-medium transition-colors ${
                  isTablet ? "px-2.5 text-[13px]" : "px-4 text-sm"
                } ${
                  view === link.view
                    ? "text-indigo-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {view === link.view && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-indigo-500" />
                )}
              </button>
            ))}
          </nav>

          <div
            className={`hidden items-center md:flex ${isTablet ? "gap-1.5" : "gap-2"}`}
          >
            {authLoading ? (
              <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 rounded-full pl-1.5 pr-3"
                  >
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={user.profilePicture || undefined} />
                      <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700">
                        {user.fullName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {!isTablet && (
                      <span className="max-w-[100px] truncate text-sm font-medium">
                        {user.fullName.split(" ")[0]}
                      </span>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground ${isTablet ? "hidden" : ""}`}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {user.fullName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => go("dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => go("my-courses")}>
                    <BookOpen className="mr-2 h-4 w-4" /> My Courses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => go("profile")}>
                    <UserIcon className="mr-2 h-4 w-4" /> Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-700"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => openAuthModal("login")}
                  className="text-sm font-medium"
                >
                  Log in
                </Button>
                <Button
                  onClick={() => openAuthModal("register")}
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-sm shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700"
                >
                  {isTablet ? "Join" : "Get Started"}
                </Button>
              </>
            )}
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto p-0">
              <SheetTitle className="mb-6 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <span className="font-extrabold">SHEEGOW</span>
                <span className="text-[10px] font-semibold tracking-widest text-indigo-500">
                  ACADEMY
                </span>
              </SheetTitle>
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <SheetClose asChild key={link.view}>
                    <button
                      onClick={() => go(link.view)}
                      className={`rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                        view === link.view
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {link.label}
                    </button>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-6 border-t pt-4">
                {user ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.profilePicture || undefined} />
                        <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700">
                          {user.fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {user.fullName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => go("dashboard")}
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => go("my-courses")}
                      >
                        <BookOpen className="mr-2 h-4 w-4" /> My Courses
                      </Button>
                    </SheetClose>
                    <Button
                      variant="destructive"
                      className="justify-start"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        onClick={() => openAuthModal("login")}
                      >
                        Log in
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        className="bg-gradient-to-r from-indigo-500 to-indigo-600"
                        onClick={() => openAuthModal("register")}
                      >
                        Get Started
                      </Button>
                    </SheetClose>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <AuthModal />
    </>
  );
}

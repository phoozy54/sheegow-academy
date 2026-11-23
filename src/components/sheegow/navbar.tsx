"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  LayoutDashboard,
  BookOpen,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Mail,
  Heart,
} from "lucide-react";
import { AuthModal } from "./auth-modal";
import { BrandLockup } from "./brand-mark";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { useI18n } from "@/lib/i18n";

/** Public pages are real routes — crawlable, shareable, openable in a new tab.
 *  Labels are i18n keys resolved via `t()` at render time. */
const NAV_LINKS: { labelKey: string; href: string }[] = [
  { labelKey: "nav.home", href: "/" },
  { labelKey: "nav.courses", href: "/courses" },
  { labelKey: "nav.liveClasses", href: "/live-classes" },
  { labelKey: "nav.calendar", href: "/calendar" },
  { labelKey: "nav.about", href: "/about" },
  { labelKey: "nav.contact", href: "/contact" },
];

export function Navbar() {
  const {
    user,
    setUser,
    authLoading,
    setAuthLoading,
    mobileMenuOpen,
    setMobileMenuOpen,
    openAuthModal,
  } = useStore();
  const { isMobile, isTablet } = useDevice();
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useI18n();

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
    router.push("/");
  };

  const isActive = (link: (typeof NAV_LINKS)[number]) =>
    pathname === link.href;

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
          <Link
            href="/"
            aria-label="SHEEGOW ACADEMY — home"
            className="shrink-0 transition-transform hover:scale-[1.02]"
          >
            <BrandLockup />
          </Link>

          <nav
            className={`hidden items-center md:flex ${isTablet ? "gap-0.5" : "gap-1"}`}
          >
            {NAV_LINKS.map((link) => {
              const active = isActive(link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-lg py-2 font-medium transition-colors ${
                    isTablet ? "px-2.5 text-[13px]" : "px-4 text-sm"
                  } ${
                    active
                      ? "text-indigo-600"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
                >
                  {t(link.labelKey)}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-indigo-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div
            className={`hidden items-center md:flex ${isTablet ? "gap-1.5" : "gap-2"}`}
          >
            <ThemeToggle />
            <LanguageToggle />
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
                        {user.username ? `@${user.username}` : user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> {t("nav.dashboard")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/messages")}>
                    <Mail className="mr-2 h-4 w-4" /> {t("nav.messages")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/my-courses")}>
                    <BookOpen className="mr-2 h-4 w-4" /> {t("nav.myCourses")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/wishlist")}>
                    <Heart className="mr-2 h-4 w-4" /> {t("nav.wishlist")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <UserIcon className="mr-2 h-4 w-4" /> {t("nav.profile")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-700"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> {t("nav.logout")}
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
                  {t("nav.login")}
                </Button>
                <Button
                  onClick={() => openAuthModal("register")}
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-sm shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700"
                >
                  {t("nav.getStarted")}
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
              <SheetTitle className="mb-6">
                <BrandLockup className="scale-95 origin-left" />
              </SheetTitle>
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => {
                  const active = isActive(link);
                  return (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={`rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                          active
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        {t(link.labelKey)}
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <span className="text-sm font-medium text-muted-foreground">
                  {locale === "ar" ? "المظهر" : locale === "so" ? "Muuqaalka" : "Appearance"}
                </span>
                <div className="flex items-center gap-1.5">
                  <ThemeToggle />
                  <LanguageToggle compact />
                </div>
              </div>
              <div className="mt-4">
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
                          {user.username ? `@${user.username}` : user.email}
                        </p>
                      </div>
                    </div>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => router.push("/dashboard")}
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4" /> {t("nav.dashboard")}
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => router.push("/messages")}
                      >
                        <Mail className="mr-2 h-4 w-4" /> {t("nav.messages")}
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => router.push("/my-courses")}
                      >
                        <BookOpen className="mr-2 h-4 w-4" /> {t("nav.myCourses")}
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => router.push("/wishlist")}
                      >
                        <Heart className="mr-2 h-4 w-4" /> {t("nav.wishlist")}
                      </Button>
                    </SheetClose>
                    <Button
                      variant="destructive"
                      className="justify-start"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> {t("nav.logout")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        onClick={() => openAuthModal("login")}
                      >
                        {t("nav.login")}
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        className="bg-gradient-to-r from-indigo-500 to-indigo-600"
                        onClick={() => openAuthModal("register")}
                      >
                        {t("nav.getStarted")}
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

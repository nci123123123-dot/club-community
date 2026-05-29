"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HelpCircle, Loader2, Users, Users2 } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { LangSwitch } from "./lang-switch";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { useCurrentUser } from "@/lib/user/provider";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const BOARD_SUB_NAV = [
  { href: "/board?category=question",  labelKey: "nav.boardQuestion",  icon: HelpCircle, category: "question" },
  { href: "/board?category=gathering", labelKey: "nav.boardGathering", icon: Users2,     category: "gathering" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BoardSubNavLinks({ tFn }: { tFn: (key: string) => string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const active = pathname === "/board" ? searchParams.get("category") : null;
  return (
    <>
      {BOARD_SUB_NAV.map((sub) => (
        <Link
          key={sub.href}
          href={sub.href}
          className={cn(
            "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
            active === sub.category
              ? "bg-[#e8f1fd] text-[#1c63b0] dark:bg-primary/20 dark:text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <sub.icon className="size-3.5" />
          {tFn(sub.labelKey)}
        </Link>
      ))}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, ready } = useCurrentUser();
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace("/onboarding");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md dark:bg-background/90">
        <div className="mx-auto flex h-[68px] w-full max-w-3xl items-center gap-2 px-4">
          <Link href="/home" className="flex items-center gap-2.5">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ background: "linear-gradient(135deg, #103f8f, #1c63b0)" }}
            >
              <Users className="size-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-bold leading-tight">동의대학교</span>
              <span className="hidden text-[10px] leading-tight text-muted-foreground sm:block">
                동아리 커뮤니티
              </span>
            </div>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <div key={item.href} className="flex items-center gap-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive(pathname, item.href)
                      ? "bg-[#e8f1fd] text-[#1c63b0] dark:bg-primary/20 dark:text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="size-4" />
                  {t(item.labelKey)}
                </Link>
                {item.href === "/board" && (
                  <Suspense>
                    <BoardSubNavLinks tFn={t} />
                  </Suspense>
                )}
              </div>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-0.5">
            <NotificationBell />
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-5 md:pb-6">
        {children}
      </main>

      {/* ── Footer (desktop only — mobile bottom nav covers this area) ── */}
      <footer
        className="hidden border-t py-3 text-center text-xs md:block"
        style={{ backgroundColor: "#103f8f" }}
      >
        <p className="text-white/60">© 2025 동의대학교 동아리 커뮤니티</p>
      </footer>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-[#1c63b0]" : "text-muted-foreground"
                )}
              >
                <item.icon className="size-5" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

"use client";

import { useEffect, type ReactNode } from "react";
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
  { href: "/board?category=question", labelKey: "nav.boardQuestion", icon: HelpCircle, category: "question" },
  { href: "/board?category=gathering", labelKey: "nav.boardGathering", icon: Users2, category: "gathering" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, ready } = useCurrentUser();
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const boardSubActive = pathname === "/board" ? searchParams.get("category") : null;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-4">
          <Link href="/home" className="flex items-center gap-2 font-bold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Users className="size-4" />
            </span>
            <span className="hidden sm:inline">{t("common.appName")}</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <div key={item.href} className="flex items-center gap-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive(pathname, item.href) && item.href !== "/board"
                      ? "bg-muted text-foreground"
                      : item.href === "/board" && pathname === "/board" && !boardSubActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="size-4" />
                  {t(item.labelKey)}
                </Link>

                {/* Board sub-nav items — desktop only */}
                {item.href === "/board" &&
                  BOARD_SUB_NAV.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                        boardSubActive === sub.category
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <sub.icon className="size-3.5" />
                      {t(sub.labelKey)}
                    </Link>
                  ))}
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6 md:pb-10">
        {children}
      </main>

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
                  active ? "text-primary" : "text-muted-foreground"
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

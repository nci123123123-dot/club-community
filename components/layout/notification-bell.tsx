"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppNotification, NotificationType } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { useCurrentUser } from "@/lib/user/provider";
import { useT } from "@/lib/i18n/provider";
import { formatDateTime } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICON_CONFIG: Record<NotificationType, { emoji: string; bg: string }> = {
  new_comment:   { emoji: "💬", bg: "bg-blue-500" },
  new_poll:      { emoji: "🗳", bg: "bg-emerald-500" },
  poll_closing:  { emoji: "⏰", bg: "bg-orange-500" },
  new_schedule:  { emoji: "📅", bg: "bg-purple-500" },
};

export function NotificationBell() {
  const { user } = useCurrentUser();
  const { t, lang } = useT();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setItems(await getRepository().listNotifications(user.id));
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (panelRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  async function handleItemClick(n: AppNotification) {
    if (removingId) return;
    setRemovingId(n.id);
    await new Promise((r) => setTimeout(r, 180));
    const repo = getRepository();
    await repo.deleteNotification(n.id);
    await load();
    setRemovingId(null);
    if (n.payload.postId) {
      setOpen(false);
      router.push(`/board/${n.payload.postId}`);
    }
  }

  async function handleClearAll() {
    if (!user) return;
    await getRepository().clearAllNotifications(user.id);
    await load();
  }

  return (
    <div className="relative">
      {/* Bell trigger */}
      <button
        ref={triggerRef}
        aria-label={t("notif.title")}
        onClick={() => { setOpen((v) => !v); if (!open) void load(); }}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className={cn(
            "fixed inset-x-2 z-50 overflow-hidden rounded-2xl border bg-background shadow-xl",
            "top-[76px]",                                          // mobile: below header
            "sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[360px]" // desktop
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-bold">{t("notif.title")}</span>
            <div className="flex items-center gap-1">
              {items.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {t("notif.deleteAll")}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Bell className="size-10 opacity-20" />
              <p className="text-sm">{t("notif.empty")}</p>
            </div>
          ) : (
            <ul className="max-h-[min(400px,60vh)] overflow-y-auto">
              {items.map((n) => {
                const cfg = ICON_CONFIG[n.type];
                const isRemoving = removingId === n.id;
                return (
                  <li
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 border-b border-border/40 px-4 py-3 last:border-0",
                      "transition-all duration-200",
                      isRemoving
                        ? "scale-95 opacity-0 bg-muted"
                        : n.payload.postId
                          ? "hover:bg-muted/50 active:bg-muted"
                          : "cursor-default hover:bg-muted/30"
                    )}
                  >
                    {/* Colored icon circle */}
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-base",
                        cfg.bg
                      )}
                    >
                      {cfg.emoji}
                    </span>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm leading-snug",
                          n.read ? "text-muted-foreground" : "font-semibold"
                        )}>
                          {t(`notif.${n.type}`, { title: n.payload.title ?? "" })}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground/60">
                          {formatDateTime(n.createdAt, lang)}
                        </span>
                      </div>
                      {n.payload.title && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {n.payload.title}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

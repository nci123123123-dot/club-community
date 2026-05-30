"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppNotification, NotificationType } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { useCurrentUser } from "@/lib/user/provider";
import { useT } from "@/lib/i18n/provider";
import { formatDateTime } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NOTIF_ICON: Record<NotificationType, string> = {
  new_poll:      "🗳",
  poll_closing:  "⏰",
  new_schedule:  "📅",
  new_comment:   "💬",
};

export function NotificationBell() {
  const { user } = useCurrentUser();
  const { t, lang } = useT();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setItems(await getRepository().listNotifications(user.id));
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const unread = items.filter((n) => !n.read).length;

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      await load();
    } else if (user && unread > 0) {
      await getRepository().markAllRead(user.id);
      await load();
    }
  }

  async function handleMarkAllRead() {
    if (!user) return;
    await getRepository().markAllRead(user.id);
    await load();
  }

  function handleItemClick(n: AppNotification) {
    setOpen(false);
    if (n.payload.postId) {
      router.push(`/board/${n.payload.postId}`);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        aria-label={t("notif.title")}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">{t("notif.title")}</span>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={handleMarkAllRead}
            >
              {t("notif.markAllRead")}
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <Bell className="size-8 opacity-25" />
            <p className="text-sm">{t("notif.empty")}</p>
          </div>
        ) : (
          <ul className="max-h-[400px] overflow-y-auto">
            {items.map((n) => (
              <li
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={cn(
                  "relative border-b border-border/40 px-3 py-2.5 last:border-0",
                  n.payload.postId ? "cursor-pointer" : "cursor-default",
                  n.read ? "hover:bg-muted/40" : "bg-primary/5 hover:bg-primary/8"
                )}
              >
                {/* Unread bar */}
                {!n.read && (
                  <span className="absolute inset-y-0 left-0 w-[3px] rounded-r bg-primary" />
                )}

                <div className="flex items-start gap-2.5 pl-2">
                  <span className="mt-0.5 shrink-0 text-base leading-none">
                    {NOTIF_ICON[n.type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm leading-snug", !n.read ? "font-semibold" : "text-muted-foreground")}>
                      {t(`notif.${n.type}`, { title: n.payload.title ?? "" })}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      {n.payload.title && (
                        <span className="truncate text-xs text-muted-foreground">
                          {n.payload.title}
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground/60">
                        {formatDateTime(n.createdAt, lang)}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

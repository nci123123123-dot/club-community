"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import type { AppNotification } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { useCurrentUser } from "@/lib/user/provider";
import { useT } from "@/lib/i18n/provider";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { user } = useCurrentUser();
  const { t } = useT();
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setItems(await getRepository().listNotifications(user.id));
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = items.filter((n) => !n.read).length;

  async function onOpenChange(open: boolean) {
    if (open) {
      await load();
    } else if (user && unread > 0) {
      await getRepository().markAllRead(user.id);
      await load();
    }
  }

  function describe(n: AppNotification): string {
    return t(`notif.${n.type}`, { title: n.payload.title ?? "" });
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
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
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-1.5 text-sm font-semibold">
          {t("notif.title")}
        </div>
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {t("notif.empty")}
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {items.map((n) => (
              <li
                key={n.id}
                className="flex items-start gap-2 rounded-md px-2 py-2 text-sm"
              >
                <span
                  aria-hidden
                  className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                    n.read ? "bg-transparent" : "bg-primary"
                  }`}
                />
                <span className="leading-snug">{describe(n)}</span>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

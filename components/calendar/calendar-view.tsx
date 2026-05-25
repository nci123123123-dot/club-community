"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Schedule } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { buildMonthGrid } from "@/lib/calendar";
import { isSameDay, toDateKey } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import { EventDialog } from "./event-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LOCALE: Record<string, string> = {
  ko: "ko-KR",
  ja: "ja-JP",
  zh: "zh-CN",
  vi: "vi-VN",
  en: "en-US",
};

export function CalendarView() {
  const { t, lang } = useT();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [defaultDate, setDefaultDate] = useState(toDateKey(today));

  const load = useCallback(async () => {
    setSchedules(await getRepository().listSchedules());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const s of schedules) {
      const key = toDateKey(new Date(s.startAt));
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [schedules]);

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(LOCALE[lang], { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2026, 1, 1 + i)));
  }, [lang]);

  const monthLabel = new Intl.DateTimeFormat(LOCALE[lang], {
    year: "numeric",
    month: "long",
  }).format(cursor);

  function shiftMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }

  function openNew(dateKey: string) {
    setEditing(null);
    setDefaultDate(dateKey);
    setDialogOpen(true);
  }

  function openEdit(schedule: Schedule) {
    setEditing(schedule);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("calendar.title")}</h1>
        <Button size="sm" onClick={() => openNew(toDateKey(today))}>
          <Plus className="size-4" />
          {t("calendar.addEvent")}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">{monthLabel}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("calendar.prevMonth")}
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            {t("calendar.today")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("calendar.nextMonth")}
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border">
        {weekdays.map((w, i) => (
          <div
            key={i}
            className="bg-muted/50 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {w}
          </div>
        ))}
        {grid.map((day, i) => {
          const inMonth = day.getMonth() === month;
          const dayKey = toDateKey(day);
          const events = eventsByDay.get(dayKey) ?? [];
          const isToday = isSameDay(day, today);
          return (
            <button
              key={i}
              type="button"
              onClick={() => openNew(dayKey)}
              className={cn(
                "flex min-h-16 flex-col gap-1 bg-background p-1.5 text-left transition-colors hover:bg-muted/50 sm:min-h-24",
                !inMonth && "bg-muted/20 text-muted-foreground/50"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs",
                  isToday && "bg-primary font-semibold text-primary-foreground"
                )}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-0.5">
                {events.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(ev);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        openEdit(ev);
                      }
                    }}
                    className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white sm:text-xs"
                    style={{ backgroundColor: ev.color }}
                  >
                    {ev.title}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schedule={editing}
        defaultDate={defaultDate}
        onSaved={load}
      />
    </div>
  );
}

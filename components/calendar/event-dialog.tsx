"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import type { Schedule } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { toDateKey } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing target, or null when creating. */
  schedule: Schedule | null;
  /** Default date (YYYY-MM-DD) when creating from a day cell. */
  defaultDate: string;
  onSaved: () => void;
}

export function EventDialog({
  open,
  onOpenChange,
  schedule,
  defaultDate,
  onSaved,
}: EventDialogProps) {
  const { t } = useT();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("10:00");
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (schedule) {
      const start = new Date(schedule.startAt);
      setTitle(schedule.title);
      setDescription(schedule.description);
      setDate(toDateKey(start));
      setTime(
        `${String(start.getHours()).padStart(2, "0")}:${String(
          start.getMinutes()
        ).padStart(2, "0")}`
      );
      setColor(schedule.color);
    } else {
      setTitle("");
      setDescription("");
      setDate(defaultDate);
      setTime("10:00");
      setColor(COLORS[0]);
    }
  }, [open, schedule, defaultDate]);

  async function save() {
    if (!title.trim() || !date) return;
    setBusy(true);
    try {
      const repo = getRepository();
      const startAt = new Date(`${date}T${time || "10:00"}:00`).toISOString();
      if (schedule) {
        await repo.updateSchedule(schedule.id, {
          title: title.trim(),
          description: description.trim(),
          startAt,
          color,
        });
      } else {
        await repo.createSchedule({
          title: title.trim(),
          description: description.trim(),
          startAt,
          endAt: null,
          color,
          postId: null,
        });
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!schedule) return;
    setBusy(true);
    try {
      await getRepository().deleteSchedule(schedule.id);
      onSaved();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {schedule ? t("schedule.title") : t("calendar.addEvent")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">{t("schedule.title")}</Label>
            <Input
              id="ev-title"
              value={title}
              placeholder={t("schedule.titlePlaceholder")}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">{t("schedule.description")}</Label>
            <Textarea
              id="ev-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-date">{t("schedule.start")}</Label>
              <Input
                id="ev-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-time">&nbsp;</Label>
              <Input
                id="ev-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("schedule.color")}</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform",
                    color === c
                      ? "scale-110 border-foreground"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {schedule?.postId && (
            <Link
              href={`/board/${schedule.postId}`}
              className="inline-block text-sm text-primary hover:underline"
            >
              {t("schedule.viewPost")}
            </Link>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          {schedule ? (
            <Button
              variant="destructive"
              size="icon"
              onClick={remove}
              disabled={busy}
              aria-label={t("common.delete")}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} disabled={busy || !title.trim()}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

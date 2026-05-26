"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Trophy } from "lucide-react";
import type { Language, LotteryWin } from "@/lib/data/types";
import { LANGUAGES } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/lib/user/provider";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const LANGUAGE_NATIVE: Record<Language, string> = {
  ko: "한국어",
  ja: "日本語",
  zh: "简体中文",
  vi: "Tiếng Việt",
  en: "English",
};

const NOTIF_KEY = "cc.notifPrefs";
type NotifPrefs = { newPoll: boolean; newSchedule: boolean; newComment: boolean };
const DEFAULT_PREFS: NotifPrefs = {
  newPoll: true,
  newSchedule: true,
  newComment: true,
};

export function SettingsView() {
  const { t, lang, setLang } = useT();
  const { user } = useCurrentUser();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [lotteryWins, setLotteryWins] = useState<LotteryWin[]>([]);

  useEffect(() => {
    setMounted(true);
    const raw = window.localStorage.getItem(NOTIF_KEY);
    if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
  }, []);

  useEffect(() => {
    if (!user || user.nationality === "KR") return;
    let active = true;
    void getRepository()
      .getLotteryWins(user.studentId)
      .then((wins) => { if (active) setLotteryWins(wins); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [user]);

  function updatePref(key: keyof NotifPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    window.localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>

      <Card className="gap-3 p-4">
        <h2 className="font-semibold">{t("settings.language")}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary",
                lang === l && "border-primary ring-1 ring-primary"
              )}
            >
              {LANGUAGE_NATIVE[l]}
              {lang === l && <Check className="size-4 text-primary" />}
            </button>
          ))}
        </div>
      </Card>

      <Card className="gap-3 p-4">
        <h2 className="font-semibold">{t("settings.appearance")}</h2>
        <div className="flex items-center justify-between">
          <Label htmlFor="dark-mode">{t("settings.darkMode")}</Label>
          <Switch
            id="dark-mode"
            checked={mounted && resolvedTheme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </Card>

      <Card className="gap-3 p-4">
        <h2 className="font-semibold">{t("settings.notifications")}</h2>
        <div className="flex items-center justify-between">
          <Label htmlFor="n-poll">{t("settings.notifNewPoll")}</Label>
          <Switch
            id="n-poll"
            checked={prefs.newPoll}
            onCheckedChange={(c) => updatePref("newPoll", c)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="n-sched">{t("settings.notifNewSchedule")}</Label>
          <Switch
            id="n-sched"
            checked={prefs.newSchedule}
            onCheckedChange={(c) => updatePref("newSchedule", c)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="n-comment">{t("settings.notifNewComment")}</Label>
          <Switch
            id="n-comment"
            checked={prefs.newComment}
            onCheckedChange={(c) => updatePref("newComment", c)}
          />
        </div>
      </Card>

      {user && (
        <Card className="gap-3 p-4">
          <h2 className="font-semibold">{t("settings.profile")}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("settings.myNationality")}</dt>
              <dd>{t(`nationality.${user.nationality}`)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("settings.myStudentId")}</dt>
              <dd className="font-mono">{user.studentId}</dd>
            </div>
          </dl>
        </Card>
      )}

      {user && user.nationality !== "KR" && (
        <Card className="gap-3 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-amber-500" />
            <h2 className="font-semibold">{t("lottery.winsSection")}</h2>
            {lotteryWins.length > 0 && (
              <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                {lotteryWins.length}
              </span>
            )}
          </div>
          {lotteryWins.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("lottery.noWins")}</p>
          ) : (
            <ul className="space-y-2">
              {lotteryWins.map((win) => (
                <li key={win.id} className="flex items-center justify-between text-sm">
                  <span className="text-amber-600 dark:text-amber-400">
                    {t(`lottery.prize.${win.prize}`)}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDateTime(win.wonAt, lang)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import type { Language, Nationality, Poll, PollResult, PollVote } from "@/lib/data/types";
import { NATIONALITIES } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/lib/user/provider";
import { isAdmin } from "@/lib/admin";
import { NATIONALITY_COLOR } from "@/lib/nationality";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function trLabel(
  translations: Partial<Record<string, string>> | undefined,
  original: string,
  lang: string
): string {
  return translations?.[lang] ?? original;
}

function timeUntilClose(closesAt: string, lang: Language): string {
  const ms = new Date(closesAt).getTime() - Date.now();
  if (ms <= 0) return "";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);

  if (lang === "ko") {
    if (days > 0) return `${days}일 ${hours}시간 후 마감`;
    if (hours > 0) return `${hours}시간 ${mins}분 후 마감`;
    return `${mins}분 후 마감`;
  }
  if (lang === "ja") {
    if (days > 0) return `${days}日${hours}時間後締切`;
    if (hours > 0) return `${hours}時間${mins}分後締切`;
    return `${mins}分後締切`;
  }
  if (lang === "zh") {
    if (days > 0) return `${days}天${hours}小时后截止`;
    if (hours > 0) return `${hours}小时${mins}分后截止`;
    return `${mins}分后截止`;
  }
  if (lang === "vi") {
    if (days > 0) return `Còn ${days}ng ${hours}h`;
    if (hours > 0) return `Còn ${hours}g ${mins}p`;
    return `Còn ${mins}p`;
  }
  if (days > 0) return `Closes in ${days}d ${hours}h`;
  if (hours > 0) return `Closes in ${hours}h ${mins}m`;
  return `Closes in ${mins}m`;
}

interface PollViewProps {
  poll: Poll;
  postAuthorId?: string;
}

export function PollView({ poll, postAuthorId }: PollViewProps) {
  const { t, lang } = useT();
  const { user } = useCurrentUser();

  const [voted, setVoted] = useState<boolean | null>(null);
  const [results, setResults] = useState<PollResult[]>([]);
  const [totalVoters, setTotalVoters] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [allVotes, setAllVotes] = useState<PollVote[]>([]);

  const admin = isAdmin(user);
  const isClosed = !!poll.closesAt && new Date(poll.closesAt).getTime() < Date.now();
  const isAuthor = !!user && !!postAuthorId && user.id === postAuthorId;

  const refresh = useCallback(async () => {
    const repo = getRepository();
    const needVotes = admin || (isClosed && isAuthor);
    const [res, total, didVote, votes] = await Promise.all([
      repo.getPollResults(poll.id),
      repo.getPollTotalVoters(poll.id),
      user ? repo.hasVoted(poll.id, user.studentId) : Promise.resolve(false),
      needVotes ? repo.getPollVotes(poll.id) : Promise.resolve([]),
    ]);
    setResults(res);
    setTotalVoters(total);
    setVoted(didVote);
    setAllVotes(votes);
  }, [poll.id, user, admin, isClosed, isAuthor]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function toggle(optionId: string) {
    setSelected((current) => {
      if (poll.multiSelect) {
        return current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      }
      return [optionId];
    });
  }

  async function vote() {
    if (!user || selected.length === 0) {
      toast.error(t("poll.selectOption"));
      return;
    }
    setSubmitting(true);
    try {
      await getRepository().vote(poll.id, selected, {
        studentId: user.studentId,
        nationality: user.nationality,
      });
      toast.success(t("poll.voteSuccess"));
      await refresh();
    } catch {
      toast.error(t("poll.alreadyVoted"));
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClosePoll() {
    if (!window.confirm(t("poll.closeConfirm"))) return;
    setSubmitting(true);
    try {
      await getRepository().closePoll(poll.id);
      toast.success(t("poll.closeSuccess"));
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelVote() {
    if (!user) return;
    setSubmitting(true);
    try {
      await getRepository().cancelVote(poll.id, user.studentId);
      toast.success(t("poll.cancelSuccess"));
      await refresh();
    } catch {
      toast.error(t("poll.alreadyVoted"));
    } finally {
      setSubmitting(false);
    }
  }

  const showResults = voted || isClosed;

  const optionLabelMap = Object.fromEntries(
    poll.options.map((o) => [
      o.id,
      { original: o.label, translations: o.labelTranslations },
    ])
  );

  return (
    <Card className="gap-4 p-5">
      {/* Question + closed badge */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">
          {trLabel(poll.questionTranslations, poll.question, lang)}
        </h2>
        {isClosed && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {t("poll.closed")}
          </span>
        )}
      </div>

      {/* Closed banner */}
      {isClosed && (
        <div className="rounded-lg bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          {t("poll.closedBanner")}
        </div>
      )}

      {voted === null ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : showResults ? (
        /* ── Results ── */
        <div className="space-y-3">
          {results.map((result) => {
            const present = NATIONALITIES.filter((n) => result.byNationality[n] > 0);
            return (
              <div key={result.optionId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {trLabel(optionLabelMap[result.optionId]?.translations, result.label, lang)}
                  </span>
                  <span className="text-muted-foreground">
                    {result.total}{t("common.people")}
                  </span>
                </div>
                {(admin || isClosed) && present.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {present.map((n: Nationality) => (
                      <span
                        key={n}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                      >
                        <span
                          aria-hidden
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: NATIONALITY_COLOR[n] }}
                        />
                        {t(`nationality.${n}`)} {result.byNationality[n]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            {t("poll.totalVoters")}: {totalVoters} {t("common.people")}
          </p>
          {voted && !isClosed && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={cancelVote}
              disabled={submitting}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {t("poll.cancelVote")}
            </Button>
          )}
        </div>
      ) : (
        /* ── Voting UI ── */
        <div className="space-y-3">
          <div className="space-y-2.5">
            {poll.options
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((option) => {
                const active = selected.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isClosed}
                    onClick={() => !isClosed && toggle(option.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border-2 px-5 py-4 text-left text-base font-medium transition-all",
                      isClosed
                        ? "cursor-not-allowed opacity-60"
                        : active
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {active && <Check className="size-3" />}
                    </span>
                    {trLabel(option.labelTranslations, option.label, lang)}
                  </button>
                );
              })}
          </div>

          {poll.closesAt && !isClosed && (
            <p className="text-xs text-muted-foreground">
              {timeUntilClose(poll.closesAt, lang)}
            </p>
          )}

          <Button
            className="h-12 w-full text-base font-semibold"
            onClick={vote}
            disabled={submitting || selected.length === 0 || isClosed}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t("poll.vote")}
          </Button>
        </div>
      )}

      {/* Early close button: author or admin, only while poll is active */}
      {(isAuthor || admin) && !isClosed && voted !== null && (
        <div className="border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={handleClosePoll}
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t("poll.closeNow")}
          </Button>
        </div>
      )}

      {/* Voter list: admin always, post author after poll closes */}
      {(admin || (isClosed && isAuthor)) && (
        <div className="border-t pt-4">
          <p className="mb-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
            {t("admin.voterList")}
          </p>
          {allVotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("admin.noVoters")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-1 pr-4 font-medium">{t("admin.studentId")}</th>
                    <th className="pb-1 pr-4 font-medium">{t("board.writtenBy")}</th>
                    <th className="pb-1 font-medium">{t("poll.option")}</th>
                  </tr>
                </thead>
                <tbody>
                  {allVotes.map((v) => (
                    <tr key={v.id} className="border-b border-border/50 last:border-0">
                      <td className="py-1 pr-4 font-mono">{v.studentId}</td>
                      <td className="py-1 pr-4">
                        <span className="inline-flex items-center gap-1">
                          <span
                            aria-hidden
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: NATIONALITY_COLOR[v.nationality] }}
                          />
                          {t(`nationality.${v.nationality}`)}
                        </span>
                      </td>
                      <td className="py-1">
                        {trLabel(
                          optionLabelMap[v.optionId]?.translations,
                          optionLabelMap[v.optionId]?.original ?? v.optionId,
                          lang
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

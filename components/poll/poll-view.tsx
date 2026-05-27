"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import type { Nationality, Poll, PollResult, PollVote } from "@/lib/data/types";
import { NATIONALITIES } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/lib/user/provider";
import { isAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import { NATIONALITY_COLOR } from "@/lib/nationality";
import { TranslatedText } from "@/components/translated-text";
import { Button } from "@/components/ui/button";

function tr(
  translations: Partial<Record<string, string>> | undefined,
  original: string,
  lang: string
): string {
  return translations?.[lang] ?? original;
}
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PollViewProps {
  poll: Poll;
}

export function PollView({ poll }: PollViewProps) {
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

  const refresh = useCallback(async () => {
    const repo = getRepository();
    const [res, total, didVote, votes] = await Promise.all([
      repo.getPollResults(poll.id),
      repo.getPollTotalVoters(poll.id),
      user ? repo.hasVoted(poll.id, user.studentId) : Promise.resolve(false),
      admin ? repo.getPollVotes(poll.id) : Promise.resolve([]),
    ]);
    setResults(res);
    setTotalVoters(total);
    setVoted(didVote);
    setAllVotes(votes);
  }, [poll.id, user, admin]);

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

  // Build a label lookup (original + translations) from poll options.
  const optionLabelMap = Object.fromEntries(
    poll.options.map((o) => [
      o.id,
      { original: o.label, translations: o.labelTranslations },
    ])
  );

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">
          {tr(poll.questionTranslations, poll.question, lang)}
        </h2>
        {isClosed && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {t("poll.closed")}
          </span>
        )}
      </div>

      {voted === null ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : showResults ? (
        <div className="space-y-4">
          {results.map((result) => {
            const ratio = totalVoters > 0 ? result.total / totalVoters : 0;
            const present = NATIONALITIES.filter(
              (n) => result.byNationality[n] > 0
            );
            return (
              <div key={result.optionId} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {tr(optionLabelMap[result.optionId]?.translations, result.label, lang)}
                  </span>
                  <span className="text-muted-foreground">
                    {result.total} {t("common.people")}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round(ratio * 100)}%` }}
                  />
                </div>
                {present.length > 0 && (
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
        <div className="space-y-3">
          <div className="space-y-2">
            {poll.options
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((option) => {
                const active = selected.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggle(option.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border px-4 py-3 text-left text-sm transition-all hover:border-primary",
                      active && "border-primary ring-1 ring-primary"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-full border",
                        active && "border-primary bg-primary text-primary-foreground"
                      )}
                    >
                      {active && <Check className="size-3" />}
                    </span>
                    {tr(option.labelTranslations, option.label, lang)}
                  </button>
                );
              })}
          </div>
          {poll.closesAt && (
            <p className="text-xs text-muted-foreground">
              {t("poll.closesAt")}: {formatDate(poll.closesAt, lang)}
            </p>
          )}
          <Button
            className="w-full"
            onClick={vote}
            disabled={submitting || selected.length === 0}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t("poll.vote")}
          </Button>
        </div>
      )}

      {/* Admin-only voter list */}
      {admin && (
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
                        {tr(
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

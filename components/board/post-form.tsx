"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getRepository } from "@/lib/data";
import { detectLanguage } from "@/lib/translate";
import { autoTranslatePost, autoTranslatePoll } from "@/lib/translate-client";
import { useT } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/lib/user/provider";
import { PollBuilder, emptyPollDraft, type PollDraft } from "@/components/poll/poll-builder";
import { LotteryModal } from "@/components/board/lottery-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

function newId(): string {
  return crypto.randomUUID();
}

export function PostForm() {
  const router = useRouter();
  const { t, lang } = useT();
  const { user } = useCurrentUser();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [pollEnabled, setPollEnabled] = useState(false);
  const [poll, setPoll] = useState<PollDraft>(emptyPollDraft);

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [lotteryPostId, setLotteryPostId] = useState<string | null>(null);

  function handleLotteryClose() {
    const id = lotteryPostId;
    setLotteryPostId(null);
    if (id) router.replace(`/board/${id}`);
  }

  async function submit() {
    if (!user) {
      toast.error(t("inapp.loginRequired"));
      router.replace("/onboarding");
      return;
    }
    if (!title.trim() || !content.trim()) {
      toast.error(t("onboarding.nameRequired"));
      return;
    }
    const cleanOptions = poll.options.map((o) => o.trim()).filter(Boolean);
    if (pollEnabled && (!poll.question.trim() || cleanOptions.length < 2)) {
      toast.error(t("poll.selectOption"));
      return;
    }

    setSubmitting(true);
    try {
      const repo = getRepository();
      const originalLanguage = detectLanguage(`${title} ${content}`);
      const translations = await autoTranslatePost(
        title.trim(),
        content.trim(),
        originalLanguage
      );
      const tags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const post = await repo.createPost({
        authorId: user.id,
        authorNationality: user.nationality,
        originalLanguage,
        tags,
        translations,
      });

      // fire-and-forget: notify admin of new post
      void fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          title: title.trim(),
          authorName: user.displayName,
          nationality: user.nationality,
          contentPreview: content.trim(),
        }),
      });

      if (pollEnabled) {
        const { questionTranslations, optionTranslations } =
          await autoTranslatePoll(poll.question.trim(), cleanOptions, originalLanguage);

        await repo.createPoll({
          postId: post.id,
          question: poll.question.trim(),
          questionTranslations,
          multiSelect: poll.multiSelect,
          closesAt: poll.closesAt
            ? new Date(`${poll.closesAt}T23:59:59`).toISOString()
            : null,
          options: cleanOptions.map((label, position) => ({
            id: newId(),
            label,
            position,
            labelTranslations: optionTranslations[position],
          })),
        });
        await repo.createNotification({
          userId: user.id,
          type: "new_poll",
          payload: { title: title.trim() },
        });
      }

      if (scheduleEnabled && scheduleDate) {
        await repo.createSchedule({
          title: title.trim(),
          description: content.trim(),
          startAt: new Date(`${scheduleDate}T10:00:00`).toISOString(),
          endAt: null,
          color: "var(--chart-1)",
          postId: post.id,
        });
        await repo.createNotification({
          userId: user.id,
          type: "new_schedule",
          payload: { title: title.trim() },
        });
      }

      // Show lottery roulette for foreign (non-KR) users; navigate after they close it.
      if (user.nationality !== "KR") {
        setLotteryPostId(post.id);
        setSubmitting(false);
      } else {
        router.replace(`/board/${post.id}`);
      }
    } catch (err) {
      console.error("[PostForm] submit failed:", err);
      toast.error(t("board.submitError"));
      setSubmitting(false);
    }
  }

  return (
    <>
      {lotteryPostId && user && (
        <LotteryModal onClose={handleLotteryClose} studentId={user.studentId} />
      )}

      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight">{t("board.newPost")}</h1>

        <div className="space-y-1.5">
          <Label htmlFor="title">{t("board.titleLabel")}</Label>
          <Input
            id="title"
            value={title}
            placeholder={t("board.titlePlaceholder")}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="content">{t("board.contentLabel")}</Label>
          <Textarea
            id="content"
            value={content}
            rows={6}
            placeholder={t("board.contentPlaceholder")}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tags">{t("board.tagsLabel")}</Label>
          <Input
            id="tags"
            value={tagsInput}
            placeholder={t("board.tagsPlaceholder")}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-poll">{t("poll.add")}</Label>
            <Switch
              id="enable-poll"
              checked={pollEnabled}
              onCheckedChange={setPollEnabled}
            />
          </div>
          {pollEnabled && <PollBuilder value={poll} onChange={setPoll} />}
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-schedule">{t("schedule.linkToCalendar")}</Label>
            <Switch
              id="enable-schedule"
              checked={scheduleEnabled}
              onCheckedChange={setScheduleEnabled}
            />
          </div>
          {scheduleEnabled && (
            <Input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          )}
        </div>

        <Button className="w-full" onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {t("board.publish")}
        </Button>
      </div>
    </>
  );
}

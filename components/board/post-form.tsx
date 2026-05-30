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
import { isAdmin } from "@/lib/admin";
import type { PostCategory } from "@/lib/data/types";
import { PollBuilder, emptyPollDraft, type PollDraft } from "@/components/poll/poll-builder";
import { LotteryModal } from "@/components/board/lottery-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function newId(): string {
  return crypto.randomUUID();
}

export function PostForm() {
  const router = useRouter();
  const { t } = useT();
  const { user } = useCurrentUser();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("question");
  const [pollEnabled, setPollEnabled] = useState(false);
  const [poll, setPoll] = useState<PollDraft>(emptyPollDraft);
  const [submitting, setSubmitting] = useState(false);
  const [lotteryPostId, setLotteryPostId] = useState<string | null>(null);

  function handleCategoryChange(cat: PostCategory) {
    setCategory(cat);
    if (cat === "gathering" && !pollEnabled) {
      setPollEnabled(true);
    } else if (cat !== "gathering" && pollEnabled) {
      const hasInput = poll.question.trim() !== "" || poll.options.some((o) => o.trim() !== "");
      if (!hasInput) setPollEnabled(false);
    }
  }

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
    const safeCategory = category === "notice" && !isAdmin(user) ? "question" : category;
    const cleanOptions = poll.options.map((o) => o.trim()).filter(Boolean);
    if (pollEnabled) {
      if (!poll.question.trim() || cleanOptions.length < 2) {
        toast.error(t("poll.selectOption"));
        return;
      }
      if (!poll.closesAt) {
        toast.error(t("write.pollDateRequired"));
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(poll.closesAt) < today) {
        toast.error(t("write.pollDatePast"));
        return;
      }
    }

    setSubmitting(true);
    try {
      const repo = getRepository();
      const originalLanguage = detectLanguage(`${title} ${content}`);

      // Save with original-language translation only — fast, no API wait
      const post = await repo.createPost({
        authorId: user.id,
        authorNationality: user.nationality,
        originalLanguage,
        category: safeCategory,
        tags: [],
        translations: [{ language: originalLanguage, title: title.trim(), content: content.trim() }],
      });

      // Background: translate to other languages (fire-and-forget)
      void autoTranslatePost(title.trim(), content.trim(), originalLanguage)
        .then((all) =>
          repo.addTranslations(
            post.id,
            all.filter((tr) => tr.language !== originalLanguage)
          )
        )
        .catch(() => {});

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

      // Push notification to all subscribers
      void fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "new_post",
          title: `새 글: ${title.trim()}`,
          body: content.trim().slice(0, 100),
          url: `${window.location.origin}/board/${post.id}`,
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
          closesAt: new Date(`${poll.closesAt}T23:59:59`).toISOString(),
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
          payload: { title: title.trim(), postId: post.id },
        });
      }

      if (user.nationality !== "KR" && safeCategory === "gathering") {
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
          <Label>{t("board.categoryLabel")}</Label>
          <div className="flex gap-2">
            {(["question", "gathering", ...(isAdmin(user) ? ["notice"] : [])] as PostCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`board.category${cat.charAt(0).toUpperCase()}${cat.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        {category !== "question" && (
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
        )}

        <Button className="w-full" onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {t("board.publish")}
        </Button>
      </div>
    </>
  );
}

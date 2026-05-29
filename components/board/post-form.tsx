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
  const { t, lang } = useT();
  const { user } = useCurrentUser();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [category, setCategory] = useState<PostCategory>("question");

  const [pollEnabled, setPollEnabled] = useState(false);
  const [poll, setPoll] = useState<PollDraft>(emptyPollDraft);

  function handleCategoryChange(cat: PostCategory) {
    const prev = category;
    setCategory(cat);
    if (cat === "gathering" && !pollEnabled) {
      setPollEnabled(true);
    } else if (prev === "gathering" && cat !== "gathering" && pollEnabled) {
      const hasInput =
        poll.question.trim() !== "" || poll.options.some((o) => o.trim() !== "");
      if (!hasInput) setPollEnabled(false);
    }
  }

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
    // Guard: non-admins cannot post to notice category
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
        category: safeCategory,
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

        <Button className="w-full" onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {t("board.publish")}
        </Button>
      </div>
    </>
  );
}

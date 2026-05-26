"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Languages, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Poll, Post } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { getTranslation, getOriginalTranslation } from "@/lib/post";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import { PollView } from "@/components/poll/poll-view";
import { CommentSection } from "@/components/board/comment-section";
import { NationalityBadge } from "@/components/nationality-badge";
import { TranslatedText } from "@/components/translated-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PostDetailProps {
  postId: string;
}

export function PostDetail({ postId }: PostDetailProps) {
  const { t, lang } = useT();
  const [post, setPost] = useState<Post | null>(null);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const repo = getRepository();
      const [p, pl] = await Promise.all([
        repo.getPost(postId),
        repo.getPollByPostId(postId),
      ]);
      if (!active) return;
      setPost(p);
      setPoll(pl);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [postId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {t("board.noResults")}
      </p>
    );
  }

  const translatable = post.originalLanguage !== lang;
  const tr = showOriginal ? getOriginalTranslation(post) : getTranslation(post, lang);

  return (
    <article className="space-y-6">
      <Link
        href="/board"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("nav.board")}
      </Link>

      <header className="space-y-3">
        <h1 className="text-2xl font-bold leading-tight tracking-tight">
          {tr.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <NationalityBadge nationality={post.authorNationality} />
          {post.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="font-normal">
              <TranslatedText text={tag} prefix="#" />
            </Badge>
          ))}
          <span className="ml-auto">{formatDateTime(post.createdAt, lang)}</span>
        </div>
      </header>

      <p className="whitespace-pre-wrap leading-relaxed">{tr.content}</p>

      {translatable && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowOriginal((v) => !v)}
        >
          <Languages className="size-4" />
          {showOriginal ? t("common.viewTranslation") : t("common.viewOriginal")}
          <span className="text-muted-foreground">
            ({(showOriginal ? post.originalLanguage : lang).toUpperCase()})
          </span>
        </Button>
      )}

      {poll && <PollView poll={poll} />}

      <hr className="border-border" />

      <CommentSection postId={post.id} />
    </article>
  );
}

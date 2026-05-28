"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Languages, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Poll, Post, User } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { getTranslation, getOriginalTranslation } from "@/lib/post";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/lib/user/provider";
import { isAdmin } from "@/lib/admin";
import { PollView } from "@/components/poll/poll-view";
import { CommentSection } from "@/components/board/comment-section";
import { NationalityBadge } from "@/components/nationality-badge";
import { TranslatedText } from "@/components/translated-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PostDetailProps {
  postId: string;
}

export function PostDetail({ postId }: PostDetailProps) {
  const router = useRouter();
  const { t, lang } = useT();
  const { user: currentUser } = useCurrentUser();
  const [post, setPost] = useState<Post | null>(null);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [likingPost, setLikingPost] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const repo = getRepository();
      const [p, pl] = await Promise.all([
        repo.getPost(postId, currentUser?.studentId),
        repo.getPollByPostId(postId),
      ]);
      if (!active) return;
      setPost(p);
      setPoll(pl);
      if (p && isAdmin(currentUser)) {
        const a = await repo.getUserById(p.authorId);
        if (active) setAuthor(a);
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [postId, currentUser]);

  async function handleLike() {
    if (!currentUser || !post) return;
    setLikingPost(true);
    try {
      const { liked, count } = await getRepository().togglePostLike(post.id, currentUser.studentId);
      setPost((prev) => prev ? { ...prev, isLikedByMe: liked, likeCount: count } : prev);
    } finally {
      setLikingPost(false);
    }
  }

  async function handleDelete() {
    if (!post) return;
    if (!window.confirm(t("admin.deleteConfirm"))) return;
    setDeleting(true);
    try {
      await getRepository().deletePost(post.id);
      router.replace("/board");
    } catch {
      setDeleting(false);
    }
  }

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

  const admin = isAdmin(currentUser);
  const canDelete = admin || currentUser?.id === post.authorId;
  const translatable = post.originalLanguage !== lang;
  const tr = showOriginal ? getOriginalTranslation(post) : getTranslation(post, lang);

  return (
    <article className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/board"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("nav.board")}
        </Link>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            {deleting
              ? <Loader2 className="size-4 animate-spin" />
              : <Trash2 className="size-4" />}
            {t("admin.deletePost")}
          </Button>
        )}
      </div>

      {/* Admin: author info panel */}
      {admin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs dark:border-amber-900 dark:bg-amber-950/30">
          <span className="mr-3 font-semibold text-amber-700 dark:text-amber-400">
            {t("admin.badge")}
          </span>
          <span className="text-muted-foreground">
            {t("admin.studentId")}:{" "}
            <span className="font-medium text-foreground">
              {author?.studentId ?? post.authorId}
            </span>
          </span>
          <span className="mx-2 text-muted-foreground/50">·</span>
          <NationalityBadge nationality={post.authorNationality} />
          {author && (
            <>
              <span className="mx-2 text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">{author.displayName}</span>
            </>
          )}
        </div>
      )}

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

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleLike}
          disabled={!currentUser || likingPost}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            post.isLikedByMe
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary",
            (!currentUser || likingPost) && "cursor-default opacity-60"
          )}
        >
          <span>👍</span>
          <span>{t("board.like")}</span>
          <span className="opacity-40">·</span>
          <span>{post.likeCount ?? 0}</span>
        </button>
      </div>

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

      <CommentSection postId={post.id} postAuthorId={post.authorId} />
    </article>
  );
}

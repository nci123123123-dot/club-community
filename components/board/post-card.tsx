"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import type { Post, PostCategory } from "@/lib/data/types";
import { getTranslation, excerpt } from "@/lib/post";
import { timeAgo } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import { TranslatedText } from "@/components/translated-text";
import {
  NATIONALITY_FLAG,
  NATIONALITY_AVATAR_GRADIENT,
} from "@/lib/nationality";
import { cn } from "@/lib/utils";

/* ── Category badge ── */
const CATEGORY_STYLE: Record<PostCategory, { bg: string; text: string; label: string }> = {
  general:  { bg: "#e8f1fd", text: "#1c63b0", label: "자유" },
  question: { bg: "#fef3df", text: "#b9760a", label: "질문" },
  gathering:{ bg: "#e6f6ee", text: "#138a55", label: "모임" },
};

interface PostCardProps {
  post: Post;
  pollClosesAt?: string | null;
}

export function PostCard({ post, pollClosesAt }: PostCardProps) {
  const { t, lang } = useT();
  const tr = getTranslation(post, lang);
  const category = post.category ?? "general";
  const cat = CATEGORY_STYLE[category];

  const hasPoll = pollClosesAt !== undefined;
  const pollActive =
    hasPoll && (pollClosesAt === null || new Date(pollClosesAt).getTime() > Date.now());

  return (
    <Link href={`/board/${post.id}`} className="block">
      <article
        className={cn(
          "rounded-xl border border-border bg-card p-3 transition-all duration-200",
          "hover:-translate-y-[3px] hover:border-primary/30 hover:shadow-md",
          "sm:p-4"
        )}
      >
        {/* ── Top badges row ── */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {/* Category */}
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: cat.bg, color: cat.text }}
          >
            {t(`board.category${category.charAt(0).toUpperCase()}${category.slice(1)}`)}
          </span>

          {/* Poll badge */}
          {hasPoll && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                pollActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <BarChart3 className="size-2.5" />
              {pollActive ? t("board.votingActive") : t("board.votingClosed")}
            </span>
          )}

          {/* Tags */}
          {post.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <TranslatedText text={tag} prefix="#" />
            </span>
          ))}
        </div>

        {/* ── Title ── */}
        <h3 className="mb-1 text-[15px] font-bold leading-snug sm:text-base">
          {tr.title}
        </h3>

        {/* ── Excerpt ── */}
        <p className="mb-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {excerpt(tr.content)}
        </p>

        {/* ── Footer: PostMeta + stats ── */}
        <div className="flex items-center justify-between gap-2">
          {/* Avatar + nationality + time */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: NATIONALITY_AVATAR_GRADIENT[post.authorNationality] }}
            >
              {NATIONALITY_FLAG[post.authorNationality]}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {t(`nationality.${post.authorNationality}`)}
            </span>
            <span className="text-[11px] text-muted-foreground/50">·</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {timeAgo(post.createdAt, lang)}
            </span>
          </div>

          {/* Like + comment counts */}
          <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
            <span>👍 {post.likeCount ?? 0}</span>
            <span>💬 {post.commentCount ?? 0}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

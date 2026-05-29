"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import type { Post, PostCategory } from "@/lib/data/types";
import { getTranslation, excerpt } from "@/lib/post";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import { NationalityBadge } from "@/components/nationality-badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CATEGORY_STYLE: Record<PostCategory, string> = {
  question: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  gathering:"bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  notice:   "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

interface PostCardProps {
  post: Post;
  pollClosesAt?: string | null;
}

export function PostCard({ post, pollClosesAt }: PostCardProps) {
  const { t, lang } = useT();
  const tr = getTranslation(post, lang);
  const category = (post.category && post.category in CATEGORY_STYLE ? post.category : "question") as PostCategory;

  const hasPoll = pollClosesAt !== undefined;
  const pollActive = hasPoll && (pollClosesAt === null || new Date(pollClosesAt).getTime() > Date.now());

  return (
    <Link href={`/board/${post.id}`} className="block">
      <Card className="gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold leading-snug">{tr.title}</h3>
          {hasPoll && (
            <span className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              pollActive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            )}>
              <BarChart3 className="size-3" />
              {pollActive ? t("board.votingActive") : t("board.votingClosed")}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {excerpt(tr.content)}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", CATEGORY_STYLE[category])}>
            {t(`board.category${category.charAt(0).toUpperCase()}${category.slice(1)}`)}
          </span>
          <NationalityBadge nationality={post.authorNationality} />
          <div className="ml-auto flex items-center gap-3">
            <span>👍 {post.likeCount ?? 0}</span>
            <span>💬 {post.commentCount ?? 0}</span>
            <span>{formatDateTime(post.createdAt, lang)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

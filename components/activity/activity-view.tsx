"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { MyPostActivity, MyVoteActivity } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { getTranslation } from "@/lib/post";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/lib/user/provider";

function pickTitle(
  translations: { language: string; title: string }[],
  lang: string,
  originalLanguage: string
): string {
  return (
    translations.find((tr) => tr.language === lang)?.title ??
    translations.find((tr) => tr.language === originalLanguage)?.title ??
    translations[0]?.title ??
    "—"
  );
}

export function ActivityView() {
  const { t, lang } = useT();
  const { user } = useCurrentUser();
  const [myPosts, setMyPosts] = useState<MyPostActivity[] | null>(null);
  const [myVotes, setMyVotes] = useState<MyVoteActivity[] | null>(null);

  useEffect(() => {
    if (!user) return;
    const repo = getRepository();
    void repo.getMyPosts(user.id).then(setMyPosts);
    void repo.getMyVotes(user.studentId).then(setMyVotes);
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">{t("nav.activity")}</h1>

      {/* 내가 쓴 글 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("activity.myPosts")}</h2>
        {myPosts === null ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : myPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("activity.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {myPosts.map(({ post, commentCount }) => {
              const tr = getTranslation(post, lang);
              return (
                <li key={post.id}>
                  <Link
                    href={`/board/${post.id}`}
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <p className="line-clamp-1 font-medium">{tr.title}</p>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      <span>{formatDateTime(post.createdAt, lang)}</span>
                      <span>💬 {commentCount}</span>
                      <span>👍 {post.likeCount ?? 0}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 내가 투표한 글 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("activity.myVotes")}</h2>
        {myVotes === null ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : myVotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("activity.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {myVotes.map((vote) => {
              const title = pickTitle(vote.postTranslations, lang, vote.postOriginalLanguage);
              return (
                <li key={`${vote.postId}-${vote.votedAt}`}>
                  <Link
                    href={`/board/${vote.postId}`}
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <p className="line-clamp-1 font-medium">{title}</p>
                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      <p>
                        <span className="mr-1">{t("activity.votedFor")}</span>
                        {vote.votedOptionLabels.join(", ")}
                      </p>
                      <p>{formatDateTime(vote.votedAt, lang)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

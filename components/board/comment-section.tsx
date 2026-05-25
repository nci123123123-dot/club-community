"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Comment } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/lib/user/provider";
import { formatDateTime } from "@/lib/format";
import { NationalityBadge } from "@/components/nationality-badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { t, lang } = useT();
  const { user } = useCurrentUser();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setComments(await getRepository().listComments(postId));
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!user || !draft.trim()) return;
    setSubmitting(true);
    try {
      const repo = getRepository();
      await repo.createComment({
        postId,
        authorNationality: user.nationality,
        content: draft.trim(),
      });
      await repo.createNotification({
        userId: user.id,
        type: "new_comment",
        payload: {},
      });
      setDraft("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="font-semibold">{t("board.comments")}</h2>

      <div className="space-y-2">
        <Textarea
          value={draft}
          rows={2}
          placeholder={t("board.commentPlaceholder")}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={add} disabled={submitting || !draft.trim()}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t("board.addComment")}
          </Button>
        </div>
      </div>

      {comments === null ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("board.noComments")}
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border p-3">
              <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                <NationalityBadge nationality={comment.authorNationality} />
                <span className="ml-auto">
                  {formatDateTime(comment.createdAt, lang)}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{comment.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

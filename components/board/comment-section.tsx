"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, CornerDownRight } from "lucide-react";
import type { Comment } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/lib/user/provider";
import { isAdmin } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import { NATIONALITY_COLOR } from "@/lib/nationality";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { t, lang } = useT();
  const { user } = useCurrentUser();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const admin = isAdmin(user);

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
        authorId: user.id,
        authorStudentId: user.studentId,
        authorNationality: user.nationality,
        content: draft.trim(),
      });
      await repo.createNotification({ userId: user.id, type: "new_comment", payload: {} });
      setDraft("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function addReply(parentId: string) {
    if (!user || !replyDraft.trim()) return;
    setSubmittingReply(true);
    try {
      await getRepository().createComment({
        postId,
        parentId,
        authorId: user.id,
        authorStudentId: user.studentId,
        authorNationality: user.nationality,
        content: replyDraft.trim(),
      });
      setReplyDraft("");
      setReplyingTo(null);
      await load();
    } finally {
      setSubmittingReply(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    try {
      await getRepository().deleteComment(id);
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  function canDelete(comment: Comment): boolean {
    if (!user) return false;
    return admin || comment.authorId === user.id;
  }

  function toggleReply(commentId: string) {
    if (replyingTo === commentId) {
      setReplyingTo(null);
      setReplyDraft("");
    } else {
      setReplyingTo(commentId);
      setReplyDraft("");
    }
  }

  function CommentMeta({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", isReply && "")}>
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: NATIONALITY_COLOR[comment.authorNationality] }}
          />
          {t(`nationality.${comment.authorNationality}`)}
        </span>
        {admin && comment.authorStudentId ? (
          <span className="font-mono text-amber-600 dark:text-amber-400">
            {comment.authorStudentId}
          </span>
        ) : (
          <span>{t("common.anonymous")}</span>
        )}
        <span className="ml-auto">{formatDateTime(comment.createdAt, lang)}</span>
        {canDelete(comment) && (
          <button
            type="button"
            aria-label={t("board.deleteComment")}
            onClick={() => remove(comment.id)}
            disabled={deletingId === comment.id}
            className="rounded p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            {deletingId === comment.id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="font-semibold">{t("board.comments")}</h2>

      {user ? (
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
      ) : (
        <p className="text-sm text-muted-foreground">{t("board.loginToComment")}</p>
      )}

      {comments === null ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("board.noComments")}
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id}>
              {/* Top-level comment */}
              <div className="rounded-lg border p-3">
                <CommentMeta comment={comment} />
                <p className="mt-1.5 text-sm leading-relaxed">
                  {comment.translations?.[lang] ?? comment.content}
                </p>
                {user && (
                  <button
                    type="button"
                    onClick={() => toggleReply(comment.id)}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t("board.reply")}
                  </button>
                )}
              </div>

              {/* Reply input */}
              {replyingTo === comment.id && (
                <div className="mt-2 ml-6 space-y-2">
                  <Textarea
                    value={replyDraft}
                    rows={2}
                    placeholder={t("board.replyPlaceholder")}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setReplyingTo(null); setReplyDraft(""); }}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => addReply(comment.id)}
                      disabled={submittingReply || !replyDraft.trim()}
                    >
                      {submittingReply && <Loader2 className="size-4 animate-spin" />}
                      {t("board.reply")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {(comment.replies ?? []).length > 0 && (
                <ul className="mt-2 ml-6 space-y-2">
                  {(comment.replies ?? []).map((reply) => (
                    <li key={reply.id} className="flex gap-2">
                      <CornerDownRight className="mt-2.5 size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 rounded-lg border bg-muted/30 p-3">
                        <CommentMeta comment={reply} isReply />
                        <p className="mt-1.5 text-sm leading-relaxed">
                          {reply.translations?.[lang] ?? reply.content}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

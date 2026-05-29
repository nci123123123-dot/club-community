"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, BarChart3, FileText, Gift } from "lucide-react";
import type { Poll, Post } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { getTranslation } from "@/lib/post";
import { timeAgo } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import { PostCard } from "@/components/board/post-card";
import { SectionHead } from "@/components/ui/section-head";
import { SideCard } from "@/components/ui/side-card";
import { Skeleton } from "@/components/ui/skeleton";
import { NATIONALITY_FLAG } from "@/lib/nationality";

interface DashboardData {
  posts: Post[];
  pollMap: Map<string, string | null>;
  activePolls: Array<{ poll: Poll; post: Post }>;
}

export function HomeDashboard() {
  const { t, lang } = useT();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const repo = getRepository();
      const posts = await repo.listPosts();
      const polls = await Promise.all(posts.map((p) => repo.getPollByPostId(p.id)));
      if (!active) return;
      const now = Date.now();
      const pollMap = new Map<string, string | null>(
        polls
          .map((poll, i) =>
            poll ? ([posts[i].id, poll.closesAt] as [string, string | null]) : null
          )
          .filter((e): e is [string, string | null] => e !== null)
      );
      const activePolls = polls
        .map((poll, i) => ({ poll, post: posts[i] }))
        .filter(
          (e): e is { poll: Poll; post: Post } =>
            e.poll !== null &&
            (!e.poll.closesAt || new Date(e.poll.closesAt).getTime() > now)
        );
      setData({ posts, pollMap, activePolls });
    }
    void load();
    return () => { active = false; };
  }, []);

  const stats = data
    ? [
        { label: t("home.statPosts"), value: data.posts.length },
        { label: t("home.statPolls"), value: data.activePolls.length },
        { label: t("home.statNations"), value: new Set(data.posts.map((p) => p.authorNationality)).size },
      ]
    : null;

  return (
    <div className="space-y-5 sm:space-y-7">
      {/* ══════════════ HERO ══════════════ */}
      <section
        className="relative overflow-hidden rounded-[20px]"
        style={{
          background: "linear-gradient(120deg, #0d285a 0%, #103f8f 52%, #1c63b0 100%)",
          boxShadow: "0 8px 32px rgba(13,40,90,0.18)",
        }}
      >
        {/* Dot pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.16) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative z-10 p-6 sm:p-10">
          <div className="flex items-start justify-between gap-6">
            {/* Left content */}
            <div className="min-w-0 flex-1 space-y-3">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                ✨ 동의대학교 동아리연합회 · 국제교류처
              </div>

              {/* Headline */}
              <h1 className="text-[22px] font-extrabold leading-tight text-white sm:text-3xl">
                함께 만드는
                <br />
                동의대 동아리 커뮤니티
              </h1>

              {/* Description */}
              <p className="text-[13px] text-white/80 sm:text-sm">
                외국인 유학생과 재학생이 함께 소통하고
                <br className="hidden sm:block" />
                동아리 활동을 공유하는 공간입니다
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Link
                  href="/board/new"
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[#103f8f] transition-opacity hover:opacity-90"
                >
                  글쓰기
                </Link>
                <Link
                  href="/board"
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  게시판 둘러보기 <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>

            {/* Right: campus illustration placeholder (desktop only) */}
            <div
              className="hidden shrink-0 lg:flex size-28 items-center justify-center rounded-2xl text-5xl"
              style={{ background: "rgba(255,255,255,0.1)" }}
              aria-hidden
            >
              🏫
            </div>
          </div>

          {/* Stats bar */}
          {stats && (
            <div className="mt-5 flex gap-5 border-t border-white/20 pt-4 sm:gap-10">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-lg font-extrabold text-white sm:text-2xl">
                    {stat.value}
                  </div>
                  <div className="text-[11px] text-white/60 sm:text-xs">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════ MAIN GRID ══════════════ */}
      {data === null ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid gap-5 sm:gap-7 lg:grid-cols-[1.6fr_1fr]">
          {/* ── Left: recent posts ── */}
          <section>
            <SectionHead icon={FileText} title={t("home.recentPosts")} href="/board" />
            {data.posts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("home.noPosts")}
              </p>
            ) : (
              <div className="space-y-3">
                {data.posts.slice(0, 5).map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    pollClosesAt={
                      data.pollMap.has(post.id)
                        ? (data.pollMap.get(post.id) ?? null)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Right: sidebar ── */}
          <aside className="space-y-4">
            {/* Active polls */}
            <SideCard
              icon={BarChart3}
              title={t("home.activePolls")}
              href="/board"
              empty={data.activePolls.length === 0 ? t("home.noPolls") : undefined}
            >
              <div className="space-y-0.5">
                {data.activePolls.slice(0, 4).map(({ poll, post }) => (
                  <Link
                    key={poll.id}
                    href={`/board/${post.id}`}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span className="flex-1 truncate">{getTranslation(post, lang).title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {NATIONALITY_FLAG[post.authorNationality]}
                    </span>
                  </Link>
                ))}
              </div>
            </SideCard>

            {/* My schedule */}
            <SideCard icon={Activity} title={t("home.mySchedule")}>
              <Link
                href="/activity"
                className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                {t("nav.activity")}
                <ArrowRight className="size-4 shrink-0" />
              </Link>
            </SideCard>

            {/* Event card */}
            <div
              className="rounded-xl border border-primary/20 p-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(232,241,253,0.8) 0%, rgba(214,232,252,0.5) 100%)",
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Gift className="size-4 text-primary" />
                <span className="text-sm font-bold text-primary">이벤트</span>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                외국인 학생이 글을 작성하면
                <br />
                커피 기프티콘 룰렛에 참여할 수 있어요! ☕
              </p>
              <Link
                href="/activity"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                내 당첨 내역 보기 <ArrowRight className="size-3" />
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-5 sm:gap-7 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="mb-1 h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-3 h-3 w-1/2" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="mb-3 h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="mb-3 h-5 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
}

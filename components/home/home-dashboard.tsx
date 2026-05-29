"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, BarChart3, FileText, Gift } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Poll, Post } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { getTranslation } from "@/lib/post";
import { useT } from "@/lib/i18n/provider";
import { PostCard } from "@/components/board/post-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardData {
  posts: Post[];
  pollMap: Map<string, string | null>;
  activePolls: Array<{ poll: Poll; post: Post }>;
}

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  href?: string;
}

function SectionHeader({ icon: Icon, title, href }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded-md bg-primary/10">
        <Icon className="size-3.5 text-primary" />
      </span>
      <h2 className="font-bold">{title}</h2>
      {href && (
        <Link
          href={href}
          className="ml-auto flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          전체보기 <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}

interface SideCardProps {
  icon: LucideIcon;
  title: string;
  href?: string;
  children: React.ReactNode;
}

function SideCard({ icon, title, href, children }: SideCardProps) {
  return (
    <Card className="p-4">
      <SectionHeader icon={icon} title={title} href={href} />
      {children}
    </Card>
  );
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
    return () => {
      active = false;
    };
  }, []);

  const stats = data
    ? [
        { label: t("home.statPosts"), value: data.posts.length },
        { label: t("home.statPolls"), value: data.activePolls.length },
        {
          label: t("home.statNations"),
          value: new Set(data.posts.map((p) => p.authorNationality)).size,
        },
      ]
    : null;

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden rounded-[20px]"
        style={{
          background: "linear-gradient(120deg, #0d285a 0%, #103f8f 52%, #1c63b0 100%)",
          boxShadow: "0 8px 32px rgba(13,40,90,0.18)",
        }}
      >
        {/* dot pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.16) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative z-10 p-7 sm:p-11">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
              동의대학교 국제교류 동아리
            </div>
            <h1 className="text-2xl font-extrabold leading-snug text-white sm:text-3xl">
              함께 만들어가는
              <br className="hidden sm:block" /> 캠퍼스 생활
            </h1>
            <p className="max-w-xs text-sm text-white/70">
              다양한 국가의 학생들과 소통하고 동아리 활동을 공유하세요
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/board/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#103f8f] transition-opacity hover:opacity-90"
              >
                글쓰기
              </Link>
              <Link
                href="/board"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                게시판 둘러보기
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          {stats && (
            <div className="mt-6 flex gap-6 border-t border-white/20 pt-4 sm:gap-10">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-xl font-bold text-white sm:text-2xl">{stat.value}</div>
                  <div className="text-xs text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Main content grid ── */}
      {data === null ? (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="gap-3 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-24" />
              </Card>
            ))}
          </div>
          <div className="space-y-4">
            <Card className="p-4">
              <Skeleton className="mb-3 h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-1.5 h-4 w-3/4" />
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* ── Left — recent posts ── */}
          <section>
            <SectionHeader icon={FileText} title={t("home.recentPosts")} href="/board" />
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

          {/* ── Right — sidebar ── */}
          <aside className="space-y-4">
            {/* Active polls */}
            <SideCard icon={BarChart3} title={t("home.activePolls")} href="/board">
              {data.activePolls.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">{t("home.noPolls")}</p>
              ) : (
                <div className="space-y-0.5">
                  {data.activePolls.slice(0, 4).map(({ poll, post }) => (
                    <Link
                      key={poll.id}
                      href={`/board/${post.id}`}
                      className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm transition-colors hover:bg-muted"
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-green-500" />
                      <span className="truncate">{getTranslation(post, lang).title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </SideCard>

            {/* My schedule */}
            <SideCard icon={Activity} title={t("home.mySchedule")}>
              <Link
                href="/activity"
                className="flex items-center justify-between rounded-md px-1.5 py-2 text-sm text-primary transition-colors hover:bg-muted"
              >
                {t("nav.activity")}
                <ArrowRight className="size-4 shrink-0" />
              </Link>
            </SideCard>

            {/* Event */}
            <SideCard icon={Gift} title="이벤트">
              <p className="mb-3 text-xs text-muted-foreground">
                외국인 학생이 글을 작성하면 커피 기프티콘 룰렛에 참여할 수 있어요!
              </p>
              <Link
                href="/activity"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                내 당첨 내역 보기 <ArrowRight className="size-3" />
              </Link>
            </SideCard>
          </aside>
        </div>
      )}
    </div>
  );
}

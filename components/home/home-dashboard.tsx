"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, BarChart3, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Poll, Post } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { getTranslation } from "@/lib/post";
import { useT } from "@/lib/i18n/provider";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardData {
  recentPosts: Post[];
  activePolls: { poll: Poll; post: Post }[];
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
      const now = Date.now();
      const activePolls = polls
        .map((poll, i) => ({ poll, post: posts[i] }))
        .filter(
          (entry): entry is { poll: Poll; post: Post } =>
            entry.poll !== null &&
            (!entry.poll.closesAt || new Date(entry.poll.closesAt).getTime() > now)
        );
      if (!active) return;
      setData({ recentPosts: posts.slice(0, 3), activePolls });
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-5">
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(120deg, #0d285a 0%, #103f8f 52%, #1c63b0 100%)",
          boxShadow: "0 8px 32px rgba(13,40,90,0.18)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative z-10 p-6 sm:p-9">
          <div className="space-y-2.5">
            <h1 className="text-[22px] font-extrabold leading-snug text-white sm:text-3xl">
              함께 만드는<br className="hidden sm:block" /> 동의대 동아리 커뮤니티
            </h1>
            <p className="text-[13px] text-white/75 sm:text-sm">
              외국인 유학생과 재학생이 함께 소통하는 공간입니다
            </p>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <Link
                href="/board/new"
                className="flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#103f8f] transition-opacity hover:opacity-90"
              >
                글쓰기
              </Link>
              <Link
                href="/board"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                게시판 보기 <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
          {data && (
            <div className="mt-5 flex gap-6 border-t border-white/20 pt-4">
              <div>
                <div className="text-lg font-bold text-white">{data.activePolls.length}</div>
                <div className="text-[11px] text-white/60">{t("home.activePolls")}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{data.recentPosts.length}</div>
                <div className="text-[11px] text-white/60">{t("home.recentPosts")}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Dashboard sections ── */}
      {data === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="gap-3 p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Section icon={Activity} title={t("home.mySchedule")} empty={null}>
            <Link
              href="/activity"
              className="block rounded-md px-1.5 py-1 text-sm text-primary hover:bg-muted"
            >
              {t("nav.activity")} →
            </Link>
          </Section>

          <Section
            icon={BarChart3}
            title={t("home.activePolls")}
            empty={data.activePolls.length === 0 ? t("home.noPolls") : null}
          >
            {data.activePolls.map(({ poll, post }) => (
              <Link
                key={poll.id}
                href={`/board/${post.id}`}
                className="block truncate rounded-md px-1.5 py-1 text-sm hover:bg-muted"
              >
                {poll.question}
              </Link>
            ))}
          </Section>

          <Section
            icon={FileText}
            title={t("home.recentPosts")}
            empty={data.recentPosts.length === 0 ? t("home.noPosts") : null}
          >
            {data.recentPosts.map((p) => (
              <Link
                key={p.id}
                href={`/board/${p.id}`}
                className="block truncate rounded-md px-1.5 py-1 text-sm hover:bg-muted"
              >
                {getTranslation(p, lang).title}
              </Link>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  icon: LucideIcon;
  title: string;
  empty: string | null;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, empty, children }: SectionProps) {
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center gap-2 font-semibold">
        <Icon className="size-4 text-primary" />
        {title}
      </div>
      {empty ? (
        <p className="py-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-0.5">{children}</div>
      )}
    </Card>
  );
}

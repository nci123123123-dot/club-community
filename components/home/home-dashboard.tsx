"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, CalendarDays, FileText, Megaphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Poll, Post, Schedule } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { getTranslation } from "@/lib/post";
import { formatTime } from "@/lib/format";
import { isSameDay } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/lib/user/provider";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const NOTICE_TAGS = ["공지", "notice", "お知らせ", "公告", "Thông báo"];

interface DashboardData {
  todaySchedules: Schedule[];
  recentPosts: Post[];
  activePolls: { poll: Poll; post: Post }[];
  notices: Post[];
}

export function HomeDashboard() {
  const { t, lang } = useT();
  const { user } = useCurrentUser();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const repo = getRepository();
      const [posts, schedules] = await Promise.all([
        repo.listPosts(),
        repo.listSchedules(),
      ]);
      const polls = await Promise.all(
        posts.map((p) => repo.getPollByPostId(p.id))
      );
      const now = Date.now();
      const today = new Date();
      const activePolls = polls
        .map((poll, i) => ({ poll, post: posts[i] }))
        .filter(
          (entry): entry is { poll: Poll; post: Post } =>
            entry.poll !== null &&
            (!entry.poll.closesAt ||
              new Date(entry.poll.closesAt).getTime() > now)
        );
      if (!active) return;
      setData({
        todaySchedules: schedules.filter((s) =>
          isSameDay(new Date(s.startAt), today)
        ),
        recentPosts: posts.slice(0, 3),
        activePolls,
        notices: posts.filter((p) =>
          p.tags.some((tag) => NOTICE_TAGS.includes(tag))
        ),
      });
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("home.greeting")}</h1>
        <p className="text-sm text-muted-foreground">{t("common.appName")}</p>
      </header>

      {data === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="gap-3 p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Section
            icon={CalendarDays}
            title={t("home.todaySchedule")}
            empty={data.todaySchedules.length === 0 ? t("home.noSchedule") : null}
          >
            {data.todaySchedules.map((s) => (
              <Link
                key={s.id}
                href="/calendar"
                className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted"
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate">{s.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatTime(s.startAt, lang)}
                </span>
              </Link>
            ))}
          </Section>

          <Section
            icon={Megaphone}
            title={t("home.notices")}
            empty={data.notices.length === 0 ? t("home.noNotices") : null}
          >
            {data.notices.map((p) => (
              <Link
                key={p.id}
                href={`/board/${p.id}`}
                className="block truncate rounded-md px-1.5 py-1 text-sm hover:bg-muted"
              >
                {getTranslation(p, lang).title}
              </Link>
            ))}
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

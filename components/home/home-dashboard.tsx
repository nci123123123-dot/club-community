"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, BarChart3, FileText } from "lucide-react";
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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("home.greeting")}</h1>
        <p className="text-sm text-muted-foreground">{t("common.appName")}</p>
      </header>
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

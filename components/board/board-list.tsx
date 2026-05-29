"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { Post, PostCategory } from "@/lib/data/types";
import { getRepository } from "@/lib/data";
import { getTranslation } from "@/lib/post";
import { useT } from "@/lib/i18n/provider";
import { PostCard } from "./post-card";
import { TranslatedText } from "@/components/translated-text";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CATEGORIES: PostCategory[] = ["general", "question", "gathering"];

function parseCategoryParam(value: string | null): PostCategory | null {
  return value && (CATEGORIES as string[]).includes(value) ? (value as PostCategory) : null;
}

export function BoardList() {
  const { t, lang } = useT();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [pollMap, setPollMap] = useState<Map<string, string | null>>(new Map());
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<PostCategory | null>(
    () => parseCategoryParam(searchParams.get("category"))
  );

  // Sync filter when URL param changes (e.g. clicking nav sub-items)
  useEffect(() => {
    setActiveCategory(parseCategoryParam(searchParams.get("category")));
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    async function load() {
      const repo = getRepository();
      const list = await repo.listPosts();
      const polls = await Promise.all(
        list.map((p) => repo.getPollByPostId(p.id))
      );
      if (!active) return;
      setPosts(list);
      setPollMap(
        new Map(
          polls
            .map((poll, i) =>
              poll ? ([list[i].id, poll.closesAt] as [string, string | null]) : null
            )
            .filter((entry): entry is [string, string | null] => entry !== null)
        )
      );
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const tags = useMemo(() => {
    if (!posts) return [];
    return Array.from(new Set(posts.flatMap((p) => p.tags)));
  }, [posts]);

  const filtered = useMemo(() => {
    if (!posts) return [];
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (activeCategory && (post.category ?? "general") !== activeCategory) return false;
      if (activeTag && !post.tags.includes(activeTag)) return false;
      if (!q) return true;
      const tr = getTranslation(post, lang);
      return (
        tr.title.toLowerCase().includes(q) ||
        tr.content.toLowerCase().includes(q)
      );
    });
  }, [posts, query, activeTag, activeCategory, lang]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("board.title")}</h1>
        <Link href="/board/new" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          {t("board.newPost")}
        </Link>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            activeCategory === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {t("board.categoryAll")}
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {t(`board.category${cat.charAt(0).toUpperCase()}${cat.slice(1)}`)}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("board.searchPlaceholder")}
          className="pl-9"
        />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              activeTag === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {t("board.allTags")}
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                activeTag === tag
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <TranslatedText text={tag} prefix="#" />
            </button>
          ))}
        </div>
      )}

      {posts === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="gap-3 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t("board.noResults")}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              pollClosesAt={pollMap.has(post.id) ? (pollMap.get(post.id) ?? null) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

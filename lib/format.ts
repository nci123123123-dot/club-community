import type { Language } from "./data/types";

const LOCALE: Record<Language, string> = {
  ko: "ko-KR",
  ja: "ja-JP",
  zh: "zh-CN",
  vi: "vi-VN",
  en: "en-US",
};

export function formatDate(iso: string, lang: Language): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, lang: Language): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTime(iso: string, lang: Language): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function timeAgo(iso: string, lang: Language): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  switch (lang) {
    case "ko":
      if (mins < 1) return "방금";
      if (mins < 60) return `${mins}분 전`;
      if (hrs < 24) return `${hrs}시간 전`;
      return `${days}일 전`;
    case "ja":
      if (mins < 1) return "たった今";
      if (mins < 60) return `${mins}分前`;
      if (hrs < 24) return `${hrs}時間前`;
      return `${days}日前`;
    case "zh":
      if (mins < 1) return "刚刚";
      if (mins < 60) return `${mins}分钟前`;
      if (hrs < 24) return `${hrs}小时前`;
      return `${days}天前`;
    case "vi":
      if (mins < 1) return "vừa xong";
      if (mins < 60) return `${mins} phút trước`;
      if (hrs < 24) return `${hrs} giờ trước`;
      return `${days} ngày trước`;
    default:
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      if (hrs < 24) return `${hrs}h ago`;
      return `${days}d ago`;
  }
}

/** YYYY-MM-DD in local time, for date inputs and day comparisons. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

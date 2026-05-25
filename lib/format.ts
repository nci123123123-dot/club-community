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

import type { Language, Translation } from "./data/types";
import { LANGUAGES } from "./data/types";

/**
 * Heuristic language detection based on script ranges. Good enough for the
 * mock layer; a real implementation would call a detection API.
 */
export function detectLanguage(text: string): Language {
  if (/[가-힣ㄱ-ㅣ]/.test(text)) return "ko";
  if (/[぀-ゟ゠-ヿ]/.test(text)) return "ja";
  if (
    /[ăâđêôơưĂÂĐÊÔƠƯạảấầẩẫậắằẳẵặẹẻẽếềểễệìỉĩịọỏốồổỗộớờởỡợùủũụứừửữựỳỵỷỹ]/i.test(
      text
    )
  ) {
    return "vi";
  }
  if (/[一-鿿]/.test(text)) return "zh";
  return "en";
}

const DICTIONARY: Record<string, Partial<Record<Language, string>>> = {
  "참여 가능": { en: "Available", ja: "参加可能", zh: "可参加", vi: "Có thể tham gia" },
  "참여 불가능": {
    en: "Unavailable",
    ja: "参加不可",
    zh: "不可参加",
    vi: "Không thể tham gia",
  },
  미정: { en: "Undecided", ja: "未定", zh: "未定", vi: "Chưa quyết định" },
};

/**
 * Translate a single string. Mirrors the shape of DeepL / OpenAI translation
 * calls — `(text, from, to)` returning a promise — so the internals can later
 * be replaced with a real API without changing callers.
 */
export async function translate(
  text: string,
  from: Language,
  to: Language
): Promise<string> {
  if (from === to) return text;
  const hit = DICTIONARY[text.trim()]?.[to];
  if (hit) return hit;
  return `[${to.toUpperCase()}] ${text}`;
}

export async function translateAll(
  text: string,
  from: Language
): Promise<{ language: Language; text: string }[]> {
  return Promise.all(
    LANGUAGES.map(async (language) => ({
      language,
      text: await translate(text, from, language),
    }))
  );
}

export async function translatePost(
  title: string,
  content: string,
  from: Language
): Promise<Translation[]> {
  return Promise.all(
    LANGUAGES.map(async (language) => ({
      language,
      title: await translate(title, from, language),
      content: await translate(content, from, language),
    }))
  );
}

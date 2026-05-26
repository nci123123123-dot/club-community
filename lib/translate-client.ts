import type { Language, Translation } from "./data/types";
import { LANGUAGES } from "./data/types";
import { translatePost as mockTranslatePost } from "./translate";

export async function translateTexts(
  texts: string[],
  from: Language,
  to: Language
): Promise<string[]> {
  if (from === to) return texts;
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, from, to }),
  });
  if (!res.ok) throw new Error(`translate api ${res.status}`);
  const data = (await res.json()) as { texts: string[] };
  return data.texts;
}

/**
 * Produce real translations of a post into all supported languages via the
 * server-side /api/translate route (MyMemory by default, OpenAI when a key is
 * configured). Falls back to the offline mock translator if the API is
 * unreachable, so posting never fails because of a translation outage.
 */
export async function autoTranslatePost(
  title: string,
  content: string,
  from: Language
): Promise<Translation[]> {
  try {
    return await Promise.all(
      LANGUAGES.map(async (language): Promise<Translation> => {
        if (language === from) return { language, title, content };
        const [translatedTitle, translatedContent] = await translateTexts(
          [title, content],
          from,
          language
        );
        return {
          language,
          title: translatedTitle || title,
          content: translatedContent || content,
        };
      })
    );
  } catch {
    return mockTranslatePost(title, content, from);
  }
}

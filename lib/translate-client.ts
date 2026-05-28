import type { Language, Translation } from "./data/types";
import { LANGUAGES } from "./data/types";
import { translate as mockTranslate, detectLanguage } from "./translate";

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
 * Translate a post into all supported languages.
 * Each target language is translated independently so a failure in one pair
 * does not cause the others to fall back to the mock translator.
 */
export async function autoTranslatePost(
  title: string,
  content: string,
  from: Language
): Promise<Translation[]> {
  return Promise.all(
    LANGUAGES.map(async (language): Promise<Translation> => {
      if (language === from) return { language, title, content };
      try {
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
      } catch {
        const [mockTitle, mockContent] = await Promise.all([
          mockTranslate(title, from, language),
          mockTranslate(content, from, language),
        ]);
        return {
          language,
          title: mockTitle || title,
          content: mockContent || content,
        };
      }
    })
  );
}

/**
 * Translate a poll question and all option labels into all supported languages.
 * All texts for a given target language are batched into a single API call to
 * minimize round-trips. Per-language fallback ensures one failure doesn't
 * discard translations for other languages.
 */
export async function autoTranslatePoll(
  question: string,
  optionLabels: string[],
  from: Language
): Promise<{
  questionTranslations: Partial<Record<Language, string>>;
  optionTranslations: Array<Partial<Record<Language, string>>>;
}> {
  const allTexts = [question, ...optionLabels];

  const byLang = await Promise.all(
    LANGUAGES.filter((l) => l !== from).map(
      async (lang): Promise<[Language, string[]]> => {
        try {
          const texts = await translateTexts(allTexts, from, lang);
          return [lang, texts];
        } catch {
          const texts = await Promise.all(
            allTexts.map((t) => mockTranslate(t, from, lang))
          );
          return [lang, texts];
        }
      }
    )
  );

  const questionTranslations: Partial<Record<Language, string>> = {
    [from]: question,
  };
  const optionTranslations: Array<Partial<Record<Language, string>>> =
    optionLabels.map((label) => ({ [from]: label }));

  for (const [lang, texts] of byLang) {
    questionTranslations[lang] = texts[0] || question;
    optionLabels.forEach((label, i) => {
      optionTranslations[i][lang] = texts[i + 1] || label;
    });
  }

  return { questionTranslations, optionTranslations };
}

export async function autoTranslateComment(
  content: string
): Promise<Partial<Record<Language, string>>> {
  const from = detectLanguage(content) as Language;
  const result: Partial<Record<Language, string>> = { [from]: content };
  await Promise.all(
    LANGUAGES.filter((l) => l !== from).map(async (lang) => {
      try {
        const [translated] = await translateTexts([content], from, lang);
        result[lang] = translated || content;
      } catch {
        result[lang] = content;
      }
    })
  );
  return result;
}

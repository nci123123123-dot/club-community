import type { Language, Post, Translation } from "./data/types";

/**
 * Pick the best translation to show for a post in the given UI language.
 * Falls back to the post's original-language version, then the first entry.
 */
export function getTranslation(post: Post, lang: Language): Translation {
  return (
    post.translations.find((tr) => tr.language === lang) ??
    post.translations.find((tr) => tr.language === post.originalLanguage) ??
    post.translations[0]
  );
}

export function getOriginalTranslation(post: Post): Translation {
  return (
    post.translations.find((tr) => tr.language === post.originalLanguage) ??
    post.translations[0]
  );
}

export function excerpt(text: string, max = 120): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

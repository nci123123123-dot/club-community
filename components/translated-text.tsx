"use client";

import { useEffect, useState } from "react";
import type { Language } from "@/lib/data/types";
import { detectLanguage } from "@/lib/translate";
import { translateTexts } from "@/lib/translate-client";
import { useT } from "@/lib/i18n/provider";

// Session-scoped cache so a given string is only translated once per language.
const cache = new Map<string, string>();

/**
 * Translate a short free-text label (poll question/option, tag) into the
 * current UI language on the fly. Renders the original immediately, then swaps
 * to the translation when ready. Source language is auto-detected unless given.
 */
export function useTranslatedText(text: string, from?: Language): string {
  const { lang } = useT();
  const [value, setValue] = useState(text);

  useEffect(() => {
    const fromLang = from ?? detectLanguage(text);
    if (!text.trim() || fromLang === lang) {
      setValue(text);
      return;
    }
    const key = `${fromLang}|${lang}|${text}`;
    const cached = cache.get(key);
    if (cached) {
      setValue(cached);
      return;
    }
    let active = true;
    setValue(text);
    translateTexts([text], fromLang, lang)
      .then(([result]) => {
        if (!result) return;
        cache.set(key, result);
        if (active) setValue(result);
      })
      .catch(() => {
        /* keep original on failure */
      });
    return () => {
      active = false;
    };
  }, [text, from, lang]);

  return value;
}

interface TranslatedTextProps {
  text: string;
  from?: Language;
  prefix?: string;
}

export function TranslatedText({ text, from, prefix }: TranslatedTextProps) {
  const translated = useTranslatedText(text, from);
  return (
    <>
      {prefix}
      {translated}
    </>
  );
}

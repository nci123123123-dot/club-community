import type { Language } from "../data/types";
import { dictionaries, type Dictionary } from "./dictionaries";

export type TranslateParams = Record<string, string | number>;

export function getDictionary(language: Language): Dictionary {
  return dictionaries[language];
}

/**
 * Look up a UI string for the given language, interpolating `{param}`
 * placeholders. Falls back to the key itself when a translation is missing so
 * issues are visible rather than silent.
 */
export function t(
  language: Language,
  key: string,
  params?: TranslateParams
): string {
  const template = dictionaries[language]?.[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) =>
    name in params ? String(params[name]) : `{${name}}`
  );
}

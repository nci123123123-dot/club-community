"use client";

import { Languages } from "lucide-react";
import type { Language } from "@/lib/data/types";
import { LANGUAGES } from "@/lib/data/types";
import { useT } from "@/lib/i18n/provider";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LANGUAGE_NATIVE: Record<Language, string> = {
  ko: "한국어",
  ja: "日本語",
  zh: "简体中文",
  vi: "Tiếng Việt",
  en: "English",
};

export function LangSwitch() {
  const { lang, setLang, t } = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("settings.language")}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
      >
        <Languages className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLang(l)}
            className={l === lang ? "font-semibold text-primary" : ""}
          >
            {LANGUAGE_NATIVE[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

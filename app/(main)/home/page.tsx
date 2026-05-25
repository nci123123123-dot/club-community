"use client";

import { useT } from "@/lib/i18n/provider";

export default function HomePage() {
  const { t } = useT();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("home.title")}</h1>
      <p className="text-muted-foreground">{t("home.greeting")}</p>
    </div>
  );
}

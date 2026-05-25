"use client";

import type { Nationality } from "@/lib/data/types";
import { NATIONALITY_COLOR } from "@/lib/nationality";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface NationalityBadgeProps {
  nationality: Nationality;
  className?: string;
}

export function NationalityBadge({
  nationality,
  className,
}: NationalityBadgeProps) {
  const { t } = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ backgroundColor: NATIONALITY_COLOR[nationality] }}
      />
      {t(`nationality.${nationality}`)}
    </span>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SectionHeadProps {
  icon: LucideIcon;
  title: string;
  href?: string;
  viewAllLabel?: string;
}

export function SectionHead({
  icon: Icon,
  title,
  href,
  viewAllLabel = "전체보기",
}: SectionHeadProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-4 text-primary" />
      </span>
      <h2 className="text-lg font-bold sm:text-[22px]">{title}</h2>
      {href && (
        <Link
          href={href}
          className="ml-auto flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          {viewAllLabel}
          <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}

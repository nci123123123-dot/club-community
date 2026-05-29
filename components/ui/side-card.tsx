import type { LucideIcon } from "lucide-react";
import { SectionHead } from "./section-head";

interface SideCardProps {
  icon: LucideIcon;
  title: string;
  href?: string;
  empty?: string;
  children: React.ReactNode;
  className?: string;
}

export function SideCard({
  icon,
  title,
  href,
  empty,
  children,
  className,
}: SideCardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 shadow-sm ${className ?? ""}`}
    >
      <SectionHead icon={icon} title={title} href={href} />
      {empty ? (
        <p className="py-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        children
      )}
    </div>
  );
}

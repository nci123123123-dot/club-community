import { Activity, Home, MessageSquareText, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  /** i18n key for the label. */
  labelKey: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", labelKey: "nav.home", icon: Home },
  { href: "/board", labelKey: "nav.board", icon: MessageSquareText },
  { href: "/activity", labelKey: "nav.activity", icon: Activity },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

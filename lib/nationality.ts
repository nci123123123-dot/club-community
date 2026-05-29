import type { Nationality } from "./data/types";

export const NATIONALITY_COLOR: Record<Nationality, string> = {
  KR: "var(--chart-1)",
  JP: "var(--chart-2)",
  CN: "var(--chart-3)",
  VN: "var(--chart-4)",
  US: "var(--chart-5)",
  OTHER: "var(--muted-foreground)",
};

export const NATIONALITY_CODE: Record<Nationality, string> = {
  KR: "KR",
  JP: "JP",
  CN: "CN",
  VN: "VN",
  US: "US",
  OTHER: "ETC",
};

export const NATIONALITY_FLAG: Record<Nationality, string> = {
  KR: "🇰🇷",
  JP: "🇯🇵",
  CN: "🇨🇳",
  VN: "🇻🇳",
  US: "🇺🇸",
  OTHER: "🌐",
};

export const NATIONALITY_AVATAR_GRADIENT: Record<Nationality, string> = {
  KR: "linear-gradient(135deg, #003478, #1c63b0)",
  JP: "linear-gradient(135deg, #bc002d, #e63946)",
  CN: "linear-gradient(135deg, #c81d1d, #f5a623)",
  VN: "linear-gradient(135deg, #da251d, #ff7043)",
  US: "linear-gradient(135deg, #002868, #3c5a9b)",
  OTHER: "linear-gradient(135deg, #5d6f8c, #8a9ab0)",
};

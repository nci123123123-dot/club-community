import type { Nationality } from "./data/types";

/** CSS color token used to represent each nationality in badges and charts. */
export const NATIONALITY_COLOR: Record<Nationality, string> = {
  KR: "var(--chart-1)",
  JP: "var(--chart-2)",
  CN: "var(--chart-3)",
  VN: "var(--chart-4)",
  US: "var(--chart-5)",
  OTHER: "var(--muted-foreground)",
};

/** Short uppercase code shown inside compact badges. */
export const NATIONALITY_CODE: Record<Nationality, string> = {
  KR: "KR",
  JP: "JP",
  CN: "CN",
  VN: "VN",
  US: "US",
  OTHER: "ETC",
};

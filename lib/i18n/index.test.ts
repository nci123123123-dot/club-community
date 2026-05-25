import { describe, it, expect } from "vitest";
import { t, getDictionary } from "./index";
import { LANGUAGES } from "../data/types";

describe("i18n", () => {
  it("returns a translated UI string", () => {
    expect(t("ja", "nav.board")).toBe("掲示板");
    expect(t("ko", "nav.board")).toBe("게시판");
    expect(t("en", "nav.board")).toBe("Board");
  });

  it("falls back to the key when missing", () => {
    expect(t("ko", "nonexistent.key")).toBe("nonexistent.key");
  });

  it("interpolates named params", () => {
    expect(t("en", "onboarding.step", { current: "2", total: "4" })).toBe(
      "Step 2 of 4"
    );
  });

  it("every language exposes the same key set", () => {
    const koKeys = Object.keys(getDictionary("ko")).sort();
    for (const lang of LANGUAGES) {
      expect(Object.keys(getDictionary(lang)).sort()).toEqual(koKeys);
    }
  });
});

import { describe, it, expect } from "vitest";
import { detectLanguage, translate, translateAll, translatePost } from "./translate";

describe("detectLanguage", () => {
  it("detects Korean from Hangul", () => {
    expect(detectLanguage("안녕하세요 동아리")).toBe("ko");
  });
  it("detects Japanese from Hiragana", () => {
    expect(detectLanguage("こんにちは みなさん")).toBe("ja");
  });
  it("detects Chinese from Han only", () => {
    expect(detectLanguage("你好世界")).toBe("zh");
  });
  it("detects Vietnamese from diacritics", () => {
    expect(detectLanguage("Xin chào các bạn")).toBe("vi");
  });
  it("falls back to English", () => {
    expect(detectLanguage("Hello everyone")).toBe("en");
  });
});

describe("translate", () => {
  it("returns same text when from === to", async () => {
    expect(await translate("동아리 모임", "ko", "ko")).toBe("동아리 모임");
  });
  it("uses dictionary match when available", async () => {
    expect(await translate("참여 가능", "ko", "en")).toBe("Available");
  });
  it("falls back to language-prefixed mock for unknown text", async () => {
    expect(await translate("임의문장", "ko", "ja")).toBe("[JA] 임의문장");
  });
});

describe("translateAll", () => {
  it("produces a translation entry for every language", async () => {
    const result = await translateAll("동아리 모임", "ko");
    expect(result.map((r) => r.language).sort()).toEqual([
      "en",
      "ja",
      "ko",
      "vi",
      "zh",
    ]);
  });
});

describe("translatePost", () => {
  it("translates title and content into all languages", async () => {
    const result = await translatePost("제목", "내용", "ko");
    expect(result).toHaveLength(5);
    const ko = result.find((r) => r.language === "ko")!;
    expect(ko.title).toBe("제목");
    expect(ko.content).toBe("내용");
    const en = result.find((r) => r.language === "en")!;
    expect(en.title).toBe("[EN] 제목");
  });
});

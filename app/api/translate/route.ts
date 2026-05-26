import { NextResponse } from "next/server";
import type { Language } from "@/lib/data/types";

// Full language names for prompt-based providers.
const LANG_NAME: Record<Language, string> = {
  ko: "Korean",
  ja: "Japanese",
  zh: "Simplified Chinese",
  vi: "Vietnamese",
  en: "English",
};

// MyMemory expects BCP-47-ish codes.
// Google translate endpoint expects BCP-47-ish codes.
const GOOGLE_LANG: Record<Language, string> = {
  ko: "ko",
  ja: "ja",
  zh: "zh-CN",
  vi: "vi",
  en: "en",
};

interface TranslateRequest {
  texts: string[];
  from: Language;
  to: Language;
}

export async function POST(request: Request) {
  let body: TranslateRequest;
  try {
    body = (await request.json()) as TranslateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { texts, from, to } = body;
  if (!Array.isArray(texts) || !from || !to) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (from === to) {
    return NextResponse.json({ texts });
  }

  try {
    let translated: string[];
    if (process.env.OPENAI_API_KEY) {
      try {
        translated = await translateWithOpenAI(texts, from, to);
      } catch (openaiErr) {
        console.error("[translate] OpenAI failed, falling back to Google:", openaiErr instanceof Error ? openaiErr.message : openaiErr);
        translated = await translateWithGoogle(texts, from, to);
      }
    } else {
      translated = await translateWithGoogle(texts, from, to);
    }
    return NextResponse.json({ texts: translated });
  } catch (error) {
    console.error("Translation failed:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 502 });
  }
}

// ---- OpenAI provider (used when OPENAI_API_KEY is set) ----

async function translateWithOpenAI(
  texts: string[],
  from: Language,
  to: Language
): Promise<string[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            `You are a professional translator specializing in Korean internet slang and informal language. ` +
            `Korean text may contain abbreviated consonants (초성) like ㄱㄱ (고고/let's go), ㄷㄷ (덜덜/shaking with fear), ` +
            `ㅋㅋ (laughing), ㄷㅊ (닥쳐/shut up), ㅇㅇ (응응/yes), ㄴㄴ (노노/no), ㅂㅂ (바이바이/bye), ` +
            `ㅈㅅ (죄송/sorry), ㄳ (감사/thanks), ㅎㅎ (하하/haha), ㅠㅠ (crying), ` +
            `and other Korean internet abbreviations. ` +
            `First interpret the full meaning of the source text including any slang or abbreviations, ` +
            `then translate naturally into ${LANG_NAME[to]}. ` +
            `Do NOT transliterate Korean consonants — translate their meaning. ` +
            `Translate each string in the user's JSON array from ${LANG_NAME[from]} to ${LANG_NAME[to]}. ` +
            `Preserve meaning and tone. Return ONLY a JSON array of translated strings in the same order and length.`,
        },
        { role: "user", content: JSON.stringify(texts) },
      ],
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "(unreadable)");
    console.error(`[translate] OpenAI error ${res.status}:`, errBody);
    throw new Error(`OpenAI ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "[]";
  console.log("[translate] OpenAI raw content:", content.slice(0, 300));
  const parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, "").trim());
  if (!Array.isArray(parsed) || parsed.length !== texts.length) {
    throw new Error("Unexpected OpenAI response shape");
  }
  return parsed.map(String);
}

// ---- Korean text preprocessor ----
// 1) Expands common internet jamo (초성) abbreviations.
// 2) Normalises colloquial 안/못+verb (no space) → 안/못 +verb so Google Translate
//    correctly recognises the negation.  Compound nouns starting with 안/못 that are
//    NOT negation markers are excluded via negative-lookahead.

function expandKoreanJamo(text: string): string {
  return (
    text
      // --- Negation spacing ---
      // Insert space between 안 (negation) and a following syllable.
      // Excluded: 안녕(hello) 안전(safety) 안쪽(inside) 안타(unfortunate/hit)
      //           안내(guidance) 안심(relief) 안경(glasses) 안건(agenda)
      //           안방(bedroom) 안색(complexion) 안착(landing) 안부(greetings)
      //           안식(rest) 안락(comfort) 안정(stability) 안팎(inside/outside)
      //           안중(consideration) 안장(saddle)
      .replace(
        /안(?!녕|전|쪽|타|내|심|경|건|방|색|착|부|식|락|정|팎|중|장)([가-힣])/g,
        "안 $1"
      )
      // Insert space between 못 (negation) and a following syllable.
      // Excluded: 못생기다(ugly) 못나다(incompetent) 못난(incompetent)
      .replace(/못(?!생|나|난)([가-힣])/g, "못 $1")
      // --- Jamo expansion ---
      .replace(/ㄱㄱ+/g, "고고")
      .replace(/ㄷㄷ+/g, "덜덜")
      .replace(/ㅋ{2,}/g, "크크크")
      .replace(/ㅎ{2,}/g, "하하하")
      .replace(/ㅠ{2,}|ㅜ{2,}/g, "흑흑")
      .replace(/ㅇㅇ/g, "응응")
      .replace(/ㄴㄴ/g, "노노")
      .replace(/ㅂㅂ/g, "바이바이")
      .replace(/ㄹㅇ/g, "리얼")
      .replace(/ㅈㅅ/g, "죄송해요")
      .replace(/ㄳ/g, "감사해요")
  );
}

// ---- Google translate provider (free, no API key required) ----

const GOOGLE_MAX = 1500;

function chunk(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > max) {
    let cut = remaining.lastIndexOf(" ", max);
    const newline = remaining.lastIndexOf("\n", max);
    cut = Math.max(cut, newline);
    if (cut <= 0) cut = max;
    parts.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  if (remaining) parts.push(remaining);
  return parts;
}

async function googleOne(
  text: string,
  from: Language,
  to: Language
): Promise<string> {
  if (!text.trim()) return text;
  const pieces = chunk(text, GOOGLE_MAX);
  const translatedPieces = await Promise.all(
    pieces.map(async (piece) => {
      const url =
        `https://translate.googleapis.com/translate_a/single?client=gtx` +
        `&sl=${GOOGLE_LANG[from]}&tl=${GOOGLE_LANG[to]}&dt=t` +
        `&q=${encodeURIComponent(piece)}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!res.ok) throw new Error(`Google translate ${res.status}`);
      // Response shape: [[[ "translated", "original", ... ], ...], ...]
      const data = (await res.json()) as [Array<[string, string]>];
      const segments = data?.[0];
      if (!Array.isArray(segments)) throw new Error("Unexpected response");
      return segments.map((seg) => seg[0]).join("");
    })
  );
  return translatedPieces.join("");
}

async function translateWithGoogle(
  texts: string[],
  from: Language,
  to: Language
): Promise<string[]> {
  const processed = from === "ko" ? texts.map(expandKoreanJamo) : texts;
  return Promise.all(processed.map((text) => googleOne(text, from, to)));
}

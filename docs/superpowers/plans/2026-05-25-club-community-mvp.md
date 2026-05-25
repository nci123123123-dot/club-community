# 다국어 동아리 커뮤니티 MVP — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 외국인 유학생과 한국인 학생이 동아리 일정/투표를 공유하는 5개국어 커뮤니티 웹앱의 코어 MVP를 mock 데이터로 즉시 동작하게 만든다.

**Architecture:** Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui. 데이터 접근은 repository 인터페이스 뒤에 숨기고 mock(localStorage) 구현으로 시작, `NEXT_PUBLIC_DATA_SOURCE` 스위치로 Supabase 전환 가능. 순수 로직은 vitest로 TDD, UI는 dev 서버 실행으로 검증.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui, vitest, Supabase(골격), date 처리는 자체 유틸.

**검증 전략:** 테스트 가능한 로직(repository, translate, 투표집계, 중복방지, i18n, 언어감지)은 vitest red-green-refactor. UI 페이지/컴포넌트는 `npm run dev` 실행 + 수동 동선 확인.

---

## Phase 0 — 프로젝트 스캐폴드

### Task 0.1: Next.js 프로젝트 초기화
**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/globals.css`

- [ ] **Step 1:** `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-npm` 실행 (현재 폴더 기준, 기존 docs/.git 유지)
- [ ] **Step 2:** `npm run dev` 실행해 기본 페이지 뜨는지 확인 (Expected: localhost:3000 정상)
- [ ] **Step 3:** vitest 설치 `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react`
- [ ] **Step 4:** `vitest.config.ts` 작성 (jsdom 환경, @ alias)
- [ ] **Step 5:** Commit `chore: scaffold next.js project with vitest`

### Task 0.2: shadcn/ui 초기화
- [ ] **Step 1:** `npx shadcn@latest init` (기본 스타일, neutral baseColor, CSS variables)
- [ ] **Step 2:** 필요한 컴포넌트 추가 `npx shadcn@latest add button card input label select dialog dropdown-menu tabs badge skeleton textarea switch sonner avatar`
- [ ] **Step 3:** Commit `chore: add shadcn/ui components`

---

## Phase 1 — 도메인 타입 & Repository 인터페이스

### Task 1.1: 도메인 타입 정의
**Files:**
- Create: `lib/data/types.ts`

- [ ] **Step 1:** 전체 도메인 타입 작성 (spec 8장 스키마와 1:1)

```typescript
export type Language = "ko" | "ja" | "zh" | "vi" | "en";
export type Nationality = "KR" | "JP" | "CN" | "VN" | "US" | "OTHER";

export interface User {
  id: string;
  studentId: string;
  displayName: string;
  nationality: Nationality;
  preferredLanguage: Language;
  isAdmin: boolean;
  createdAt: string;
}

export interface Translation { language: Language; title: string; content: string; }

export interface Post {
  id: string;
  authorId: string;
  authorNationality: Nationality;
  originalLanguage: Language;
  tags: string[];
  translations: Translation[];
  createdAt: string;
}

export interface PollOption { id: string; label: string; position: number; }
export interface Poll {
  id: string;
  postId: string;
  question: string;
  multiSelect: boolean;
  closesAt: string | null;
  options: PollOption[];
}
export interface PollVote { id: string; pollId: string; optionId: string; studentId: string; nationality: Nationality; votedAt: string; }
export interface PollResult { optionId: string; label: string; byNationality: Record<Nationality, number>; total: number; }

export interface Schedule {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string | null;
  color: string;
  postId: string | null;
  createdAt: string;
}

export interface Comment { id: string; postId: string; authorNationality: Nationality; content: string; createdAt: string; }

export type NotificationType = "new_poll" | "poll_closing" | "new_schedule" | "new_comment";
export interface AppNotification { id: string; userId: string; type: NotificationType; payload: Record<string, string>; read: boolean; createdAt: string; }
```

- [ ] **Step 2:** Commit `feat: add domain types`

### Task 1.2: Repository 인터페이스
**Files:**
- Create: `lib/data/repository.ts`

- [ ] **Step 1:** 인터페이스 정의

```typescript
import type { User, Post, Poll, PollVote, PollResult, Schedule, Comment, AppNotification } from "./types";

export interface DataRepository {
  // users
  findUserByStudentId(studentId: string): Promise<User | null>;
  createUser(input: Omit<User, "id" | "createdAt" | "isAdmin">): Promise<User>;
  // posts
  listPosts(): Promise<Post[]>;
  getPost(id: string): Promise<Post | null>;
  createPost(input: Omit<Post, "id" | "createdAt">): Promise<Post>;
  // polls
  getPollByPostId(postId: string): Promise<Poll | null>;
  createPoll(input: Omit<Poll, "id">): Promise<Poll>;
  vote(pollId: string, optionIds: string[], voter: { studentId: string; nationality: User["nationality"] }): Promise<void>;
  hasVoted(pollId: string, studentId: string): Promise<boolean>;
  getPollResults(pollId: string): Promise<PollResult[]>;
  getPollTotalVoters(pollId: string): Promise<number>;
  // schedules
  listSchedules(): Promise<Schedule[]>;
  createSchedule(input: Omit<Schedule, "id" | "createdAt">): Promise<Schedule>;
  updateSchedule(id: string, patch: Partial<Schedule>): Promise<Schedule>;
  deleteSchedule(id: string): Promise<void>;
  // comments
  listComments(postId: string): Promise<Comment[]>;
  createComment(input: Omit<Comment, "id" | "createdAt">): Promise<Comment>;
  // notifications
  listNotifications(userId: string): Promise<AppNotification[]>;
  markAllRead(userId: string): Promise<void>;
}
```

- [ ] **Step 2:** Commit `feat: add repository interface`

---

## Phase 2 — 자동번역 + 언어감지 (TDD)

### Task 2.1: 언어 감지 유틸
**Files:**
- Create: `lib/translate.ts`, Test: `lib/translate.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
import { describe, it, expect } from "vitest";
import { detectLanguage } from "./translate";

describe("detectLanguage", () => {
  it("detects Korean from Hangul", () => expect(detectLanguage("안녕하세요 동아리")).toBe("ko"));
  it("detects Japanese from Hiragana", () => expect(detectLanguage("こんにちは")).toBe("ja"));
  it("detects Chinese from Han only", () => expect(detectLanguage("你好世界")).toBe("zh"));
  it("detects Vietnamese from diacritics", () => expect(detectLanguage("Xin chào các bạn")).toBe("vi"));
  it("falls back to English", () => expect(detectLanguage("Hello everyone")).toBe("en"));
});
```

- [ ] **Step 2:** Run `npx vitest run lib/translate.test.ts` → FAIL
- [ ] **Step 3: 구현**

```typescript
import type { Language } from "./data/types";

export function detectLanguage(text: string): Language {
  if (/[가-힣]/.test(text)) return "ko";
  if (/[぀-ゟ゠-ヿ]/.test(text)) return "ja";
  if (/[一-鿿]/.test(text)) return "zh";
  if (/[ăâđêôơưĂÂĐÊÔƠƯạảấầẩẫậắằẳẵặẹẻẽếềểễệ]/i.test(text)) return "vi";
  return "en";
}
```

- [ ] **Step 4:** Run test → PASS
- [ ] **Step 5:** Commit `feat: add language detection`

### Task 2.2: 자동번역 함수 (교체 가능 시그니처)
**Files:**
- Modify: `lib/translate.ts`, Test: `lib/translate.test.ts`

- [ ] **Step 1: 실패 테스트 추가**

```typescript
import { translate, translateAll } from "./translate";

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
    expect(result.map(r => r.language).sort()).toEqual(["en","ja","ko","vi","zh"]);
  });
});
```

- [ ] **Step 2:** Run → FAIL
- [ ] **Step 3: 구현** — DeepL/OpenAI와 동일한 `(text, from, to)` 시그니처. 내부만 mock.

```typescript
import type { Translation } from "./data/types";
const LANGS: Language[] = ["ko","ja","zh","vi","en"];
const DICT: Record<string, Partial<Record<Language,string>>> = {
  "참여 가능": { en:"Available", ja:"参加可能", zh:"可参加", vi:"Có thể tham gia" },
  "참여 불가능": { en:"Unavailable", ja:"参加不可", zh:"不可参加", vi:"Không thể tham gia" },
  "미정": { en:"Undecided", ja:"未定", zh:"未定", vi:"Chưa quyết định" },
};
export async function translate(text: string, from: Language, to: Language): Promise<string> {
  if (from === to) return text;
  const hit = DICT[text.trim()]?.[to];
  if (hit) return hit;
  return `[${to.toUpperCase()}] ${text}`;
}
export async function translateAll(text: string, from: Language): Promise<{ language: Language; text: string }[]> {
  return Promise.all(LANGS.map(async l => ({ language: l, text: await translate(text, from, l) })));
}
export async function translatePost(title: string, content: string, from: Language): Promise<Translation[]> {
  return Promise.all(LANGS.map(async l => ({ language: l, title: await translate(title, from, l), content: await translate(content, from, l) })));
}
```

- [ ] **Step 4:** Run → PASS
- [ ] **Step 5:** Commit `feat: add mock auto-translation with swappable signature`

---

## Phase 3 — Mock Repository (TDD 핵심 로직)

### Task 3.1: localStorage 저장소 헬퍼
**Files:**
- Create: `lib/data/mock/store.ts`

- [ ] **Step 1:** SSR-safe key-value 헬퍼 (서버에선 메모리, 클라에선 localStorage)

```typescript
const mem = new Map<string, string>();
const hasLS = () => typeof window !== "undefined" && !!window.localStorage;
export function read<T>(key: string, fallback: T): T {
  const raw = hasLS() ? window.localStorage.getItem(key) : mem.get(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}
export function write<T>(key: string, value: T): void {
  const raw = JSON.stringify(value);
  if (hasLS()) window.localStorage.setItem(key, raw); else mem.set(key, raw);
}
export const uid = () => crypto.randomUUID();
```

- [ ] **Step 2:** Commit `feat: add mock store helper`

### Task 3.2: 투표 집계 + 중복방지 (TDD — 보안 핵심)
**Files:**
- Create: `lib/data/mock/index.ts`, Test: `lib/data/mock/poll.test.ts`

- [ ] **Step 1: 실패 테스트** — 국적 집계, 학번 중복투표 차단, 이름 비노출

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { MockRepository } from "./index";

describe("poll voting", () => {
  let repo: MockRepository;
  let pollId: string;
  beforeEach(async () => {
    repo = new MockRepository();
    const post = await repo.createPost({ authorId:"a", authorNationality:"KR", originalLanguage:"ko", tags:[], translations:[] });
    const poll = await repo.createPoll({ postId: post.id, question:"올래?", multiSelect:false, closesAt:null,
      options:[{id:"o1",label:"가능",position:0},{id:"o2",label:"불가",position:1}] });
    pollId = poll.id;
  });
  it("aggregates votes by nationality, never exposing names", async () => {
    await repo.vote(pollId, ["o1"], { studentId:"1", nationality:"KR" });
    await repo.vote(pollId, ["o1"], { studentId:"2", nationality:"JP" });
    const results = await repo.getPollResults(pollId);
    const o1 = results.find(r => r.optionId === "o1")!;
    expect(o1.byNationality.KR).toBe(1);
    expect(o1.byNationality.JP).toBe(1);
    expect(o1.total).toBe(2);
    expect(JSON.stringify(results)).not.toContain("studentId");
  });
  it("blocks duplicate vote by same studentId", async () => {
    await repo.vote(pollId, ["o1"], { studentId:"1", nationality:"KR" });
    await expect(repo.vote(pollId, ["o2"], { studentId:"1", nationality:"KR" })).rejects.toThrow(/already voted/i);
    expect(await repo.getPollTotalVoters(pollId)).toBe(1);
  });
  it("rejects multiple options when multiSelect is false", async () => {
    await expect(repo.vote(pollId, ["o1","o2"], { studentId:"3", nationality:"CN" })).rejects.toThrow(/single/i);
  });
});
```

- [ ] **Step 2:** Run → FAIL
- [ ] **Step 3: MockRepository 구현** — DataRepository 전체 구현. 투표 로직 핵심:
  - `vote`: `hasVoted` 검사 → throw "already voted"; multiSelect=false인데 optionIds.length>1 → throw "single"; 각 옵션마다 PollVote push
  - `getPollResults`: votes를 optionId로 group, 각 그룹을 nationality로 카운트, 모든 Nationality 키 0으로 초기화 후 누적. studentId는 결과에 미포함
  - `getPollTotalVoters`: 고유 studentId 수
- [ ] **Step 4:** Run → PASS
- [ ] **Step 5:** Commit `feat: implement mock repository with poll aggregation and dedup`

### Task 3.3: 학번 중복가입 방지 (TDD)
**Files:**
- Modify: `lib/data/mock/index.ts`, Test: `lib/data/mock/user.test.ts`

- [ ] **Step 1: 실패 테스트**

```typescript
it("prevents duplicate student id", async () => {
  const repo = new MockRepository();
  await repo.createUser({ studentId:"20250123", displayName:"Tanaka", nationality:"JP", preferredLanguage:"ja" });
  await expect(repo.createUser({ studentId:"20250123", displayName:"Other", nationality:"KR", preferredLanguage:"ko" }))
    .rejects.toThrow(/exists/i);
});
```

- [ ] **Step 2:** Run → FAIL
- [ ] **Step 3:** `createUser`에서 `findUserByStudentId` 검사 후 throw 추가
- [ ] **Step 4:** Run → PASS
- [ ] **Step 5:** Commit `feat: prevent duplicate student id registration`

### Task 3.4: Supabase 골격 + 팩토리
**Files:**
- Create: `lib/data/supabase/index.ts`, `lib/data/index.ts`, `lib/data/seed.ts`

- [ ] **Step 1:** `SupabaseRepository implements DataRepository` — 각 메서드에 `@supabase/supabase-js` 호출 주석 + `throw new Error("Supabase not configured")` 골격. 상단에 클라이언트 생성 코드 주석 포함.
- [ ] **Step 2:** `lib/data/index.ts`: `NEXT_PUBLIC_DATA_SOURCE === "supabase" ? new SupabaseRepository() : new MockRepository()` 싱글톤 export `getRepository()`
- [ ] **Step 3:** `seed.ts`: 샘플 유저3·게시글2(번역포함)·투표1·일정3·공지 생성 함수. 최초 1회 실행 플래그.
- [ ] **Step 4:** Commit `feat: add supabase skeleton, repository factory, seed data`

---

## Phase 4 — i18n (TDD 조회 + Provider)

### Task 4.1: 사전 + 번역 조회
**Files:**
- Create: `lib/i18n/dictionaries.ts`, `lib/i18n/index.ts`, Test: `lib/i18n/index.test.ts`

- [ ] **Step 1: 실패 테스트**

```typescript
import { t, getDictionary } from "./index";
it("returns translated UI string", () => expect(t("ja", "nav.board")).toBe("掲示板"));
it("falls back to key when missing", () => expect(t("ko", "nonexistent.key")).toBe("nonexistent.key"));
it("every language has the same keys", () => {
  const ko = Object.keys(getDictionary("ko"));
  for (const l of ["ja","zh","vi","en"] as const) expect(Object.keys(getDictionary(l)).sort()).toEqual(ko.sort());
});
```

- [ ] **Step 2:** Run → FAIL
- [ ] **Step 3:** `dictionaries.ts`에 5개 언어 flat key 사전 작성 (nav.*, onboarding.*, board.*, poll.*, calendar.*, settings.*, common.*). `t(lang, key)` 와 `getDictionary(lang)` 구현.
- [ ] **Step 4:** Run → PASS
- [ ] **Step 5:** Commit `feat: add i18n dictionaries and lookup`

### Task 4.2: i18n Provider + 훅
**Files:**
- Create: `lib/i18n/provider.tsx`

- [ ] **Step 1:** `LanguageProvider` (Context) — localStorage `lang` 읽기/쓰기, `useT()` 훅이 `(key) => t(lang, key)` 와 `{ lang, setLang }` 반환.
- [ ] **Step 2:** dev 서버로 확인 (다음 Phase에서 사용)
- [ ] **Step 3:** Commit `feat: add language provider and useT hook`

---

## Phase 5 — Provider 레이어 & 유저 컨텍스트

### Task 5.1: 테마 + 유저 Provider
**Files:**
- Create: `lib/user/provider.tsx`, `components/theme-provider.tsx`, Modify: `app/layout.tsx`

- [ ] **Step 1:** `next-themes` 설치 + ThemeProvider (다크모드 class 전략)
- [ ] **Step 2:** `UserProvider`: localStorage `currentUser` 로드, `useCurrentUser()`, `setCurrentUser()`. seed 1회 실행.
- [ ] **Step 3:** `app/layout.tsx`에 ThemeProvider > LanguageProvider > UserProvider 중첩 + sonner Toaster
- [ ] **Step 4:** dev 실행 확인 (에러 없이 부팅)
- [ ] **Step 5:** Commit `feat: add theme and user providers`

---

## Phase 6 — 온보딩 (언어→이름→학번→국적)

### Task 6.1: 온보딩 게이트 + 스텝 UI
**Files:**
- Create: `app/page.tsx`, `app/onboarding/page.tsx`, `components/onboarding/steps.tsx`

- [ ] **Step 1:** `app/page.tsx`: currentUser 있으면 `/home`, 없으면 `/onboarding` redirect
- [ ] **Step 2:** 온보딩 4스텝 컴포넌트 — ① 언어선택(5개 카드, 선택 즉시 setLang) ② 이름 input ③ 학번 input(숫자) ④ 국적 select. 진행바.
- [ ] **Step 3:** 마지막 단계에서 `createUser` 호출 → 중복학번이면 toast 에러 → 성공 시 setCurrentUser + `/home`
- [ ] **Step 4:** dev 실행 검증: 5개 언어 선택→입력→완료→메인 이동, 같은 학번 재가입 차단 확인
- [ ] **Step 5:** Commit `feat: add onboarding flow with simple auth`

---

## Phase 7 — 레이아웃 셸 (네비 + 알림 골격)

### Task 7.1: 앱 셸
**Files:**
- Create: `app/(main)/layout.tsx`, `components/layout/{nav,bottom-nav,notification-bell,lang-switch}.tsx`

- [ ] **Step 1:** 데스크탑 사이드/상단 네비 + 모바일 하단 탭바 (홈/게시판/캘린더/설정). 모바일 우선.
- [ ] **Step 2:** 우측 상단 알림벨: dropdown-menu에 `listNotifications` mock 표시, 안읽음 뱃지, 열면 markAllRead.
- [ ] **Step 3:** 모든 라벨 `useT()` 사용.
- [ ] **Step 4:** dev 검증: 반응형(모바일/데스크탑), 다크모드 토글, 언어전환 즉시 반영
- [ ] **Step 5:** Commit `feat: add app shell with nav and notification bell`

---

## Phase 8 — 게시판 (목록/작성/상세 + 번역토글 + 댓글)

### Task 8.1: 게시판 목록 + 검색/태그
**Files:**
- Create: `app/(main)/board/page.tsx`, `components/board/{post-card,post-filters}.tsx`

- [ ] **Step 1:** `listPosts` → 카드 그리드. 각 카드는 현재 UI 언어 번역본 제목/요약 + 작성자 국적 뱃지 + 태그 + 시간. Skeleton 로딩.
- [ ] **Step 2:** 검색 input(제목/내용 contains) + 태그 필터 칩. URL searchParams 동기화.
- [ ] **Step 3:** dev 검증
- [ ] **Step 4:** Commit `feat: add board list with search and tag filter`

### Task 8.2: 게시글 작성 (+투표 추가 +일정 연동)
**Files:**
- Create: `app/(main)/board/new/page.tsx`, `components/board/post-form.tsx`, `components/poll/poll-builder.tsx`

- [ ] **Step 1:** 제목/내용/태그 폼. 제출 시 `detectLanguage`→`translatePost`→`createPost`.
- [ ] **Step 2:** "투표 추가" 토글 → poll-builder(질문, 옵션 추가/삭제 기본3개 프리셋, 다중선택 스위치, 마감일) → `createPoll(postId)`.
- [ ] **Step 3:** "캘린더에 일정 추가" 체크 → 날짜 입력 → `createSchedule({ postId })`.
- [ ] **Step 4:** 성공 시 상세로 이동 + 알림 생성(new_poll/new_schedule).
- [ ] **Step 5:** dev 검증: 한국어 작성→자동번역 생성 확인
- [ ] **Step 6:** Commit `feat: add post creation with poll and schedule`

### Task 8.3: 상세 + 번역토글 + 투표 + 댓글
**Files:**
- Create: `app/(main)/board/[id]/page.tsx`, `components/poll/poll-view.tsx`, `components/board/comment-section.tsx`

- [ ] **Step 1:** 현재 언어 번역본 표시 + "원문 보기" 토글(originalLanguage 표시).
- [ ] **Step 2:** poll-view: 미투표 시 옵션 선택+투표 버튼, 투표 후/마감 시 국적별 결과 막대 + 총 참여인원. `hasVoted`로 분기. 이름 절대 미표시.
- [ ] **Step 3:** comment-section: 국적만 표기된 댓글 목록 + 작성. 작성 시 new_comment 알림.
- [ ] **Step 4:** dev 검증: 투표→국적통계 표시, 재투표 차단 toast, 언어 바꾸면 번역본 전환
- [ ] **Step 5:** Commit `feat: add post detail with translation toggle, voting, comments`

---

## Phase 9 — 캘린더

### Task 9.1: 월간 캘린더 + CRUD
**Files:**
- Create: `app/(main)/calendar/page.tsx`, `components/calendar/{month-grid,event-dialog}.tsx`, Test: `lib/calendar.test.ts`, `lib/calendar.ts`

- [ ] **Step 1: 실패 테스트** — 월 그리드 생성 유틸

```typescript
import { buildMonthGrid } from "./calendar";
it("builds 6-week grid starting on Sunday", () => {
  const grid = buildMonthGrid(2026, 4); // May 2026
  expect(grid.length).toBe(42);
  expect(grid[0].getDay()).toBe(0);
});
```

- [ ] **Step 2:** Run → FAIL
- [ ] **Step 3:** `buildMonthGrid(year, month)` 구현 (해당 월 1일이 속한 주 일요일부터 42칸)
- [ ] **Step 4:** Run → PASS
- [ ] **Step 5:** month-grid: 일정 색상 dot, 클릭 시 상세 dialog. event-dialog: 추가/수정/삭제. postId 있으면 게시글 링크.
- [ ] **Step 6:** dev 검증: 추가→그리드 반영, 수정/삭제, 월 이동
- [ ] **Step 7:** Commit `feat: add monthly calendar with event CRUD`

---

## Phase 10 — 메인 + 설정

### Task 10.1: 메인 대시보드
**Files:**
- Create: `app/(main)/home/page.tsx`

- [ ] **Step 1:** 4섹션: 오늘 일정(`listSchedules` 필터) / 최근 게시글(상위3) / 진행중 투표(미마감) / 공지(공지 태그). Skeleton.
- [ ] **Step 2:** dev 검증
- [ ] **Step 3:** Commit `feat: add home dashboard`

### Task 10.2: 설정
**Files:**
- Create: `app/(main)/settings/page.tsx`

- [ ] **Step 1:** 언어 변경(setLang) / 다크모드 스위치(next-themes) / 알림 토글(localStorage) / 내 국적·학번 표시(본인만).
- [ ] **Step 2:** dev 검증: 언어/테마 즉시 반영 + 새로고침 유지
- [ ] **Step 3:** Commit `feat: add settings page`

---

## Phase 11 — Supabase 스키마 + 배포 + 문서

### Task 11.1: SQL 스키마 + RLS
**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1:** 9개 테이블 CREATE + 인덱스 + `unique(poll_id, student_id)` 제약.
- [ ] **Step 2:** RLS 정책: users 본인 read/관리자 전체, poll_votes insert는 본인 학번만·select 차단(집계는 SECURITY DEFINER 함수/뷰), posts/translations/schedules/comments 전체 read.
- [ ] **Step 3:** 국적별 집계 뷰 `poll_results_by_nationality` (이름/학번 미노출).
- [ ] **Step 4:** Commit `feat: add supabase schema with RLS`

### Task 11.2: 환경변수 + 배포 설정 + README
**Files:**
- Create: `.env.example`, `README.md`

- [ ] **Step 1:** `.env.example`: `NEXT_PUBLIC_DATA_SOURCE=mock`, `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=`, (주석) `DEEPL_API_KEY` / `OPENAI_API_KEY`.
- [ ] **Step 2:** README: 소개, 기능, 로컬 실행(`npm i && npm run dev`), mock↔supabase 전환법, Supabase 셋업(schema.sql 실행), Vercel 배포(import→env 입력→deploy), 번역 API 교체 위치.
- [ ] **Step 3:** Commit `docs: add env example and README`

### Task 11.3: 최종 점검
- [ ] **Step 1:** `npx vitest run` 전체 통과 확인
- [ ] **Step 2:** `npm run build` 성공 확인
- [ ] **Step 3:** `npm run dev`로 전체 동선 1회 점검 (온보딩→게시글작성→투표→캘린더→설정)
- [ ] **Step 4:** Commit `chore: final mvp verification`

---

## Self-Review 결과

- **Spec coverage:** 인증(P6)·게시판/번역(P2,P8)·투표 국적통계/중복방지(P3.2,P8.3)·캘린더(P9)·알림 골격(P7)·댓글(P8.3)·i18n(P4)·다크모드(P5,P10.2)·스키마/RLS(P11.1)·배포/README(P11.2)·샘플데이터(P3.4) 전부 태스크 존재. ✓
- **Placeholder scan:** 핵심 로직 코드 포함, UI 태스크는 파일·동작·검증법 명시. ✓
- **Type consistency:** repository 메서드명이 mock/supabase/팩토리/UI에서 동일. translate 시그니처 일관. ✓

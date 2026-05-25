# 다국어 동아리 커뮤니티 (Club Community)

외국인 유학생과 한국인 학생이 동아리 일정 공유와 투표를 쉽게 할 수 있는 **5개 국어 커뮤니티 웹앱**입니다. 복잡한 회원가입 없이 이름/학번/국적만으로 사용하고, 게시글은 5개 언어로 자동 번역되며, 투표는 개인 이름 대신 **국적별 통계**만 공개합니다.

## 주요 기능

- **5개 국어 지원** — 한국어 / 日本語 / 简体中文 / Tiếng Việt / English. 최초 접속 시 언어 선택, localStorage 저장 후 자동 적용.
- **간편 인증** — 이름·학번·국적만 입력. 학번 중복 가입 차단. 비밀번호 없음.
- **게시판 + 자동 번역** — 작성 언어 감지 후 5개 언어 번역본 자동 생성. UI 언어에 맞는 번역본 표시 + 원문 토글.
- **투표 (이름 비공개)** — 국적별 참여 통계만 표시. 학번 기준 중복 투표 방지. 다중 선택·마감일·실시간 결과.
- **캘린더** — 월간 뷰, 일정 추가/수정/삭제, 색상 표시, 게시글 연동.
- **알림** — 새 투표/일정/댓글 알림 (우측 상단 벨).
- **다크 모드 / 모바일 우선 반응형 / 접근성 / Skeleton 로딩**.

## 기술 스택

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · vitest · Supabase(연동 골격) · Vercel 배포 기준.

## 빠른 시작

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속 → 언어 선택 → 이름/학번/국적 입력 → 바로 사용. **Supabase 설정 없이 mock 데이터로 즉시 동작**합니다 (샘플 게시글·투표·일정 포함).

```bash
npm test         # 단위 테스트 (번역, 투표 집계, 중복 방지, i18n, 캘린더)
npm run build    # 프로덕션 빌드
```

## 데이터 백엔드 전환 (mock ↔ Supabase)

데이터 접근은 `lib/data/repository.ts` 인터페이스 뒤에 숨겨져 있어, 컴포넌트 변경 없이 백엔드를 교체할 수 있습니다.

- `lib/data/mock/` — localStorage 기반 구현 (기본값, 즉시 동작)
- `lib/data/supabase/` — Supabase 구현 골격
- `lib/data/index.ts` — `NEXT_PUBLIC_DATA_SOURCE` 값으로 자동 선택

### Supabase 연동 절차

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. SQL 편집기에서 `supabase/schema.sql` 실행 (9개 테이블 + RLS + 국적 집계 뷰)
3. `.env.local` 생성 후 값 입력:
   ```
   NEXT_PUBLIC_DATA_SOURCE=supabase
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. `npm install @supabase/supabase-js`
5. `lib/data/supabase/index.ts`의 각 메서드를 실제 쿼리로 구현 (시그니처는 이미 mock과 동일)

> API 키는 채팅/커밋에 붙여넣지 말고 반드시 `.env.local`에만 두세요. (`.env*.local`은 git에서 제외됩니다.)

## 자동 번역

게시글 작성 시 원본 언어를 감지해 나머지 4개 언어로 **실제 번역**한 뒤 저장합니다. 외국인 유학생은 자신이 선택한 언어로 글을 읽고, 상세 화면에서 원문도 토글로 볼 수 있습니다.

- 번역은 서버 라우트 `app/api/translate/route.ts`를 통해 수행됩니다 (클라이언트가 외부 API를 직접 호출하지 않음).
- **키 없이 동작**: 기본값은 무료·무가입 [MyMemory](https://mymemory.translated.net/) API.
- **품질 업그레이드**: `.env.local`에 `OPENAI_API_KEY`를 넣으면 자동으로 OpenAI(gpt-4o-mini)로 전환됩니다.
- 네트워크/쿼터 문제로 번역 API가 실패하면 오프라인 mock 번역기로 폴백해 글쓰기는 항상 성공합니다.
- DeepL은 베트남어를 지원하지 않아 사용하지 않습니다.

> 게시글 본문이 번역 API(MyMemory/OpenAI)로 전송되는 점을 유의하세요. 사내/민감 내용은 자체 호스팅 번역기로 교체하는 것을 권장합니다.

## 보안 모델

- `users` 테이블은 anon 키로 **조회 불가** — 이름/학번이 일반 클라이언트로 노출되지 않음.
- 학번 중복 확인은 행을 노출하지 않는 `student_exists()` (SECURITY DEFINER) 함수로 수행.
- `poll_votes` 원본 행은 조회 불가 — 집계는 이름/학번 없는 `poll_results_by_nationality` 뷰로만 노출.
- 화면에는 국적 통계만 표시, 이름은 절대 비공개.

## Vercel 배포

1. 저장소를 GitHub에 push
2. [vercel.com](https://vercel.com)에서 Import Project
3. 환경변수 입력 (mock으로 띄우려면 `NEXT_PUBLIC_DATA_SOURCE=mock`만; Supabase 연동 시 위 3개)
4. Deploy

빌드 명령(`next build`)과 출력 디렉토리는 Vercel이 자동 감지합니다.

## 폴더 구조

```
app/
  onboarding/            언어→이름→학번→국적
  (main)/                인증된 화면 (셸 레이아웃)
    home/ board/ calendar/ settings/
components/               UI (board, poll, calendar, layout, settings, ...)
lib/
  data/                  repository 인터페이스 + mock/supabase 구현 + seed
  i18n/                  5개 국어 사전 + Provider
  translate.ts           언어 감지 + 자동 번역 (교체 가능)
  calendar.ts format.ts post.ts nationality.ts
supabase/schema.sql      DB 스키마 + RLS
docs/superpowers/        설계·구현 계획 문서
```

# 다국어 동아리 커뮤니티 — 설계 문서

- 작성일: 2026-05-25
- 상태: 승인됨 (브레인스토밍 단계)
- 코드네임: `club-community`

## 1. 목적

외국인 유학생과 한국인 학생이 동아리 일정 공유와 투표를 쉽게 할 수 있는 다국어 커뮤니티 웹사이트. 복잡한 회원가입 없이 이름/학번/국적만으로 사용 가능하며, 게시글은 5개 언어로 자동 번역되고, 투표는 개인 이름 대신 국적별 통계만 공개한다.

## 2. 기술 스택

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (DB + Storage) — 단, MVP는 mock 어댑터로 동작
- Vercel 배포 기준
- 모바일 우선 반응형 + 다크모드
- 패키지 매니저: npm (Windows 호환성)

## 3. 지원 언어

한국어(ko), 일본어(ja), 중국어 간체(zh), 베트남어(vi), 영어(en)

- 최초 접속 시 언어 선택 화면
- 선택 언어는 localStorage 저장 후 자동 적용
- 모든 UI 문구가 선택 언어로 변경

## 4. 핵심 아키텍처 결정: 어댑터 패턴

MVP는 mock으로 시작하되, 코드 변경 없이 Supabase로 전환 가능하도록 데이터 접근을 repository 인터페이스 뒤에 숨긴다.

```
lib/data/
  types.ts          # 전체 도메인 타입
  repository.ts      # 인터페이스 (UserRepo, PostRepo, PollRepo, ScheduleRepo, ...)
  mock/              # localStorage 기반 구현 (현재 동작)
  supabase/          # Supabase 구현 (골격 + 주석, 나중에 활성화)
  index.ts           # NEXT_PUBLIC_DATA_SOURCE 보고 mock/supabase 선택
```

- 전환 스위치: `NEXT_PUBLIC_DATA_SOURCE=mock|supabase`
- 비즈니스 로직/컴포넌트는 인터페이스만 의존 → 백엔드 교체 시 영향 없음

## 5. 폴더 구조

```
club-community/
  app/
    layout.tsx                 # 루트: 테마/언어/유저 Provider
    page.tsx                   # 게이트: 온보딩 안 했으면 /onboarding
    onboarding/page.tsx        # 언어선택 → 이름 → 학번 → 국적
    (main)/
      home/page.tsx            # 오늘 일정/최근글/진행중 투표/공지
      board/page.tsx           # 게시글 목록 + 검색 + 태그
      board/[id]/page.tsx      # 상세 + 번역토글 + 투표 + 댓글
      board/new/page.tsx       # 작성 (+ 투표 추가 + 캘린더 연동)
      calendar/page.tsx        # 월간 캘린더
      settings/page.tsx        # 언어/다크모드/알림
  components/ui/               # shadcn
  components/{board,poll,calendar,layout}/
  lib/data/                    # repository 레이어
  lib/i18n/                    # 5개국어 사전 + Provider 훅
  lib/translate.ts             # mock 자동번역 (DeepL/OpenAI 교체 가능 시그니처)
  supabase/schema.sql          # 9개 테이블 + RLS 정책
  docs/superpowers/specs/      # 본 문서
```

## 6. 핵심 데이터 흐름

### 6.1 간편 인증
1. 온보딩에서 언어선택 → 이름 → 학번 → 국적 입력
2. 학번 중복 체크 (mock: localStorage 인덱스 / supabase: unique 제약)
3. 유저 생성 후 `localStorage.currentUser` 저장
4. 이후 `useCurrentUser()` 훅이 자동 주입 (자동 로그인처럼 동작)
5. 비밀번호 없음. 학번이 사실상 식별자.

### 6.2 자동 번역
1. 작성 시 원본 언어 감지
2. `translate(text, from, to)` 를 나머지 4개 언어로 호출
3. `translations` 테이블/객체에 저장
4. mock 구현: 사전 매칭 + `[JA] 원문` 식 프리픽스 폴백
5. 표시: 현재 UI 언어 버전, "원문 보기" 토글 제공
6. 함수 시그니처를 DeepL/OpenAI와 동일하게 설계 → 내부만 교체

### 6.3 투표 (이름 비공개)
1. 투표 시 `{student_id, option_id, nationality}` 저장
2. 같은 학번 재투표 차단 (DB unique / mock 동일 로직)
3. 결과는 국적별 GROUP BY 집계만 화면 노출
4. 이름/학번은 클라이언트로 내려가지 않음
5. 옵션: 다중 선택 가능 여부 설정, 투표 마감일, 실시간 결과, 총 참여 인원

예시 표시:
```
참여 가능 — 한국 3 · 일본 2 · 중국 1
참여 불가능 — 베트남 1
```

## 7. 보안 요구사항

- 일반 유저 화면에서 이름/학번 직접 노출 금지, 국적 통계만 표시
- Supabase RLS: `users`는 본인 row만 read, 관리자만 전체 조회
- `poll_votes`는 국적별 집계 형태로만 노출
- 중복 투표 방지: `unique(poll_id, student_id)` + mock 동일 로직
- 동일 학번 중복 가입 방지

## 8. 데이터베이스 스키마 (9개 테이블)

- `users` — id, student_id(unique), display_name, nationality, preferred_language, created_at
- `posts` — id, author_id, original_language, tags, created_at
- `translations` — id, post_id, language, title, content
- `polls` — id, post_id, question, multi_select, closes_at, created_at
- `poll_options` — id, poll_id, label, position
- `poll_votes` — id, user_id, poll_option_id, nationality, voted_at, unique(poll_id, student_id)
- `schedules` — id, title, description, start_at, end_at, color, post_id(nullable), created_at
- `comments` — id, post_id, author_id, content, created_at
- `notifications` — id, user_id, type, payload, read, created_at

## 9. MVP 범위

### 완성 (1단계)
- 언어 선택 · 간편 인증 · 다크모드
- 게시판 목록 / 작성 / 상세
- 자동번역 mock
- 투표 국적통계 + 중복방지
- 캘린더 월간뷰 + CRUD

### 골격만 (UI 존재, 동작 일부)
- 알림 (아이콘 + 드롭다운, mock 데이터)
- 댓글 (작성/표시 되나 알림연동 없음)
- 검색 · 태그필터 (기본만)
- 게시글 ↔ 캘린더 자동연결 (현재는 수동)

## 10. UI/UX

- Discord + Notion 느낌의 깔끔한 UI
- 모바일 최적화 필수
- 접근성 고려 (semantic HTML, 키보드 네비, 대비)
- 버튼/카드 부드러운 애니메이션
- 로딩 상태 Skeleton UI

## 11. 결과물 체크리스트

- 전체 프로젝트 코드 / 폴더 구조
- DB 스키마 (schema.sql) + RLS
- Supabase 연동 골격 코드
- 다국어 처리 구조 (i18n)
- 자동 번역 구조 (교체 가능 시그니처)
- Vercel 배포 설정 + 설명
- README.md
- 샘플 데이터 (mock seed)
- 모바일 대응 UI
- 환경변수(.env.example) 구조

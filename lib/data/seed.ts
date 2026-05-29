import type { DataRepository } from "./repository";
import type { Poll, Post, Schedule } from "./types";
import { autoTranslatePost } from "../translate-client";
import { read, write } from "./mock/store";

// Bump when the sample content (or its translations) changes so existing
// installs re-seed. v1 used the offline mock translator; v2 uses real
// translations via /api/translate. v3 adds admin support + full data reset.
// v4 forces cache clear to remove stale notices/data from old sessions.
const SEED_VERSION = 4;
const VERSION_KEY = "cc.seedVersion";
const LEGACY_FLAG = "cc.seeded";

// Mock-store collection keys (kept in sync with lib/data/mock/index.ts).
const MK = {
  posts: "cc.posts",
  polls: "cc.polls",
  votes: "cc.votes",
  schedules: "cc.schedules",
} as const;

const SEED_AUTHOR = "seed-admin";
const SEED_SCHEDULE_TITLES = new Set(["신입 환영회", "정기 모임", "5월 MT"]);

function daysFromNow(days: number, hour = 18): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// localStorage key used by lib/user/provider.tsx to persist the logged-in user.
const CURRENT_USER_KEY = "cc.currentUser";

/**
 * Full data reset: wipe all content and users so the app starts clean.
 * Called on every seed-version upgrade to ensure no stale test data persists.
 */
function resetAllData(): void {
  write(MK.posts, []);
  write(MK.polls, []);
  write(MK.votes, []);
  write(MK.schedules, []);
  write("cc.users", []);
  write("cc.comments", []);
  write("cc.notifications", []);
  // Clear the persisted logged-in user so they re-onboard with clean state.
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CURRENT_USER_KEY);
  }
}

/**
 * Populate the (mock) repository with sample content. Idempotent per version:
 * if the current SEED_VERSION is already applied it is a no-op; otherwise it
 * clears prior seed artifacts and reseeds with freshly translated content.
 */
export async function seedRepository(repo: DataRepository): Promise<void> {
  const applied = read<number>(VERSION_KEY, 0);
  if (applied === SEED_VERSION) return;

  // Full reset on every version upgrade — clears test/stale data.
  resetAllData();
  write(VERSION_KEY, SEED_VERSION);
  write(LEGACY_FLAG, true);

  // --- Notice post ---
  const noticeTranslations = await autoTranslatePost(
    "동아리 신입 환영회 공지",
    "이번 주 금요일에 신입 환영회를 진행합니다. 많은 참여 바랍니다!",
    "ko"
  );
  await repo.createPost({
    authorId: SEED_AUTHOR,
    authorNationality: "KR",
    originalLanguage: "ko",
    tags: ["공지"],
    translations: noticeTranslations,
  });

  // --- MT post + poll + sample votes ---
  const mtTranslations = await autoTranslatePost(
    "5월 MT 일정 투표",
    "5월 MT 날짜를 정하려고 합니다. 참여 가능 여부를 투표해주세요.",
    "ko"
  );
  const mtPost = await repo.createPost({
    authorId: SEED_AUTHOR,
    authorNationality: "KR",
    originalLanguage: "ko",
    tags: ["MT", "일정"],
    translations: mtTranslations,
  });

  const poll = await repo.createPoll({
    postId: mtPost.id,
    question: "5월 MT 참여 가능하세요?",
    multiSelect: false,
    closesAt: daysFromNow(7),
    options: [
      { id: "opt-yes", label: "참여 가능", position: 0 },
      { id: "opt-no", label: "참여 불가능", position: 1 },
      { id: "opt-maybe", label: "미정", position: 2 },
    ],
  });

  const sampleVotes: {
    studentId: string;
    nationality: "KR" | "JP" | "CN" | "VN";
    option: string;
  }[] = [
    { studentId: "seed-1", nationality: "KR", option: "opt-yes" },
    { studentId: "seed-2", nationality: "KR", option: "opt-yes" },
    { studentId: "seed-3", nationality: "KR", option: "opt-yes" },
    { studentId: "seed-4", nationality: "JP", option: "opt-yes" },
    { studentId: "seed-5", nationality: "JP", option: "opt-yes" },
    { studentId: "seed-6", nationality: "CN", option: "opt-yes" },
    { studentId: "seed-7", nationality: "VN", option: "opt-no" },
    { studentId: "seed-8", nationality: "CN", option: "opt-maybe" },
  ];
  for (const v of sampleVotes) {
    await repo.vote(poll.id, [v.option], {
      studentId: v.studentId,
      nationality: v.nationality,
    });
  }

  // --- Schedules ---
  await repo.createSchedule({
    title: "신입 환영회",
    description: "신입 부원 환영 모임",
    startAt: daysFromNow(2, 19),
    endAt: null,
    color: "var(--chart-1)",
    postId: null,
  });
  await repo.createSchedule({
    title: "정기 모임",
    description: "주간 정기 모임",
    startAt: daysFromNow(5, 18),
    endAt: null,
    color: "var(--chart-2)",
    postId: null,
  });
  await repo.createSchedule({
    title: "5월 MT",
    description: "1박 2일 MT",
    startAt: daysFromNow(10, 10),
    endAt: daysFromNow(11, 14),
    color: "var(--chart-3)",
    postId: mtPost.id,
  });
}

/** Give a freshly-onboarded user a couple of starter notifications. */
export async function seedUserNotifications(
  repo: DataRepository,
  userId: string
): Promise<void> {
  const existing = await repo.listNotifications(userId);
  if (existing.length > 0) return;
  await repo.createNotification({
    userId,
    type: "new_poll",
    payload: { title: "5월 MT 일정 투표" },
  });
  await repo.createNotification({
    userId,
    type: "new_schedule",
    payload: { title: "신입 환영회" },
  });
}

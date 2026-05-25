import type { DataRepository, Voter } from "../repository";
import type {
  AppNotification,
  Comment,
  Poll,
  PollResult,
  Post,
  Schedule,
  User,
} from "../types";

/**
 * Supabase-backed implementation skeleton.
 *
 * To activate:
 *   1. `npm install @supabase/supabase-js`
 *   2. Set NEXT_PUBLIC_DATA_SOURCE=supabase and the SUPABASE env vars
 *   3. Run supabase/schema.sql in the Supabase SQL editor
 *   4. Replace each `notConfigured()` below with the real query (examples in
 *      comments). The method signatures already match DataRepository, so no
 *      consumer code changes.
 *
 * Example client setup (uncomment once the package is installed):
 *
 *   import { createClient } from "@supabase/supabase-js";
 *   const supabase = createClient(
 *     process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
 *   );
 */
function notConfigured(): never {
  throw new Error(
    "Supabase repository is not configured yet. Set NEXT_PUBLIC_DATA_SOURCE=mock " +
      "or implement lib/data/supabase/index.ts (see schema.sql)."
  );
}

export class SupabaseRepository implements DataRepository {
  async findUserByStudentId(_studentId: string): Promise<User | null> {
    // const { data } = await supabase.from("users").select("*").eq("student_id", studentId).maybeSingle();
    return notConfigured();
  }

  async createUser(
    _input: Omit<User, "id" | "createdAt" | "isAdmin">
  ): Promise<User> {
    // await supabase.from("users").insert({ ... }).select().single();
    return notConfigured();
  }

  async listPosts(): Promise<Post[]> {
    // await supabase.from("posts").select("*, translations(*)").order("created_at", { ascending: false });
    return notConfigured();
  }

  async getPost(_id: string): Promise<Post | null> {
    return notConfigured();
  }

  async createPost(_input: Omit<Post, "id" | "createdAt">): Promise<Post> {
    return notConfigured();
  }

  async getPollByPostId(_postId: string): Promise<Poll | null> {
    return notConfigured();
  }

  async createPoll(_input: Omit<Poll, "id">): Promise<Poll> {
    return notConfigured();
  }

  async vote(
    _pollId: string,
    _optionIds: string[],
    _voter: Voter
  ): Promise<void> {
    // Relies on the unique(poll_id, student_id) constraint to block duplicates.
    return notConfigured();
  }

  async hasVoted(_pollId: string, _studentId: string): Promise<boolean> {
    return notConfigured();
  }

  async getPollResults(_pollId: string): Promise<PollResult[]> {
    // Read from the poll_results_by_nationality view so names/ids never leave the DB.
    return notConfigured();
  }

  async getPollTotalVoters(_pollId: string): Promise<number> {
    return notConfigured();
  }

  async listSchedules(): Promise<Schedule[]> {
    return notConfigured();
  }

  async createSchedule(
    _input: Omit<Schedule, "id" | "createdAt">
  ): Promise<Schedule> {
    return notConfigured();
  }

  async updateSchedule(
    _id: string,
    _patch: Partial<Schedule>
  ): Promise<Schedule> {
    return notConfigured();
  }

  async deleteSchedule(_id: string): Promise<void> {
    return notConfigured();
  }

  async listComments(_postId: string): Promise<Comment[]> {
    return notConfigured();
  }

  async createComment(
    _input: Omit<Comment, "id" | "createdAt">
  ): Promise<Comment> {
    return notConfigured();
  }

  async listNotifications(_userId: string): Promise<AppNotification[]> {
    return notConfigured();
  }

  async createNotification(
    _input: Omit<AppNotification, "id" | "createdAt" | "read">
  ): Promise<AppNotification> {
    return notConfigured();
  }

  async markAllRead(_userId: string): Promise<void> {
    return notConfigured();
  }
}

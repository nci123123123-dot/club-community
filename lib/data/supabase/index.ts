import type { DataRepository, Voter } from "../repository";
import type {
  AppNotification,
  Comment,
  Language,
  LotteryWin,
  Nationality,
  Poll,
  PollResult,
  PollVote,
  Post,
  Schedule,
  Translation,
  User,
} from "../types";
import { NATIONALITIES } from "../types";
import { ADMIN_STUDENT_ID } from "../../admin";
import { supabase } from "./client";

// ---------- raw DB row shapes ----------

interface DBUser {
  id: string;
  student_id: string;
  display_name: string;
  nationality: string;
  preferred_language: string;
  is_admin: boolean;
  created_at: string;
}

interface DBTranslation {
  post_id: string;
  language: string;
  title: string;
  content: string;
}

interface DBPost {
  id: string;
  author_id: string | null;
  author_nationality: string;
  original_language: string;
  tags: string[];
  created_at: string;
  translations?: DBTranslation[];
}

interface DBPollOption {
  id: string;
  poll_id: string;
  label: string;
  position: number;
  label_translations?: Record<string, string>;
}

interface DBPoll {
  id: string;
  post_id: string;
  question: string;
  question_translations?: Record<string, string>;
  multi_select: boolean;
  closes_at: string | null;
  poll_options?: DBPollOption[];
}

interface DBVote {
  id: string;
  poll_id: string;
  poll_option_id: string;
  student_id: string;
  nationality: string;
  voted_at: string;
}

interface DBSchedule {
  id: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string | null;
  color: string;
  post_id: string | null;
  created_at: string;
}

interface DBComment {
  id: string;
  post_id: string;
  author_id: string | null;
  author_name: string | null;
  author_nationality: string;
  content: string;
  created_at: string;
}

interface DBNotification {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, string>;
  read: boolean;
  created_at: string;
}

interface DBLotteryWin {
  id: string;
  user_id: string;
  won_at: string;
  prize: string;
}

interface DBPollResultRow {
  poll_id: string;
  poll_option_id: string;
  label: string;
  nationality: string | null;
  votes: number | string;
}

// ---------- mappers ----------

function mapUser(row: DBUser): User {
  return {
    id: row.id,
    studentId: row.student_id,
    displayName: row.display_name,
    nationality: row.nationality as Nationality,
    preferredLanguage: row.preferred_language as Language,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
  };
}

function mapPost(row: DBPost): Post {
  return {
    id: row.id,
    authorId: row.author_id ?? "",
    authorNationality: row.author_nationality as Nationality,
    originalLanguage: row.original_language as Language,
    tags: row.tags ?? [],
    translations: (row.translations ?? []).map(
      (t): Translation => ({
        language: t.language as Language,
        title: t.title,
        content: t.content,
      })
    ),
    createdAt: row.created_at,
  };
}

function mapPoll(row: DBPoll): Poll {
  return {
    id: row.id,
    postId: row.post_id,
    question: row.question,
    questionTranslations: (row.question_translations ?? {}) as Partial<Record<Language, string>>,
    multiSelect: row.multi_select,
    closesAt: row.closes_at,
    options: (row.poll_options ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((o) => ({
        id: o.id,
        label: o.label,
        position: o.position,
        labelTranslations: (o.label_translations ?? {}) as Partial<Record<Language, string>>,
      })),
  };
}

function emptyByNationality(): Record<Nationality, number> {
  return NATIONALITIES.reduce(
    (acc, n) => ({ ...acc, [n]: 0 }),
    {} as Record<Nationality, number>
  );
}

function throwIfError(
  error: { message: string; code?: string; details?: string | null; hint?: string | null } | null,
  ctx: string
): void {
  if (error) {
    console.error(`[Supabase:${ctx}]`, { message: error.message, code: error.code, details: error.details, hint: error.hint });
    throw new Error(`[Supabase:${ctx}] ${error.message}${error.code ? ` (code: ${error.code})` : ""}`);
  }
}

// ---------- repository ----------

export class SupabaseRepository implements DataRepository {
  // ---- users ----

  async findUserByStudentId(studentId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();
    throwIfError(error, "findUserByStudentId");
    return data ? mapUser(data as DBUser) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfError(error, "getUserById");
    return data ? mapUser(data as DBUser) : null;
  }

  async createUser(
    input: Omit<User, "id" | "createdAt" | "isAdmin">
  ): Promise<User> {
    const existing = await this.findUserByStudentId(input.studentId);
    if (existing) return existing;
    const { data, error } = await supabase
      .from("users")
      .insert({
        student_id: input.studentId,
        display_name: input.displayName,
        nationality: input.nationality,
        preferred_language: input.preferredLanguage,
        is_admin: input.studentId === ADMIN_STUDENT_ID,
      })
      .select()
      .single();
    throwIfError(error, "createUser");
    return mapUser(data as DBUser);
  }

  // ---- posts ----

  async listPosts(): Promise<Post[]> {
    const { data, error } = await supabase
      .from("posts")
      .select("*, translations(*)")
      .order("created_at", { ascending: false });
    throwIfError(error, "listPosts");
    return (data ?? []).map((row) => mapPost(row as DBPost));
  }

  async getPost(id: string): Promise<Post | null> {
    const { data, error } = await supabase
      .from("posts")
      .select("*, translations(*)")
      .eq("id", id)
      .maybeSingle();
    throwIfError(error, "getPost");
    return data ? mapPost(data as DBPost) : null;
  }

  async createPost(input: Omit<Post, "id" | "createdAt">): Promise<Post> {
    const { data: post, error: postErr } = await supabase
      .from("posts")
      .insert({
        author_id: input.authorId || null,
        author_nationality: input.authorNationality,
        original_language: input.originalLanguage,
        tags: input.tags,
      })
      .select()
      .single();
    throwIfError(postErr, "createPost:post");

    const dbPost = post as DBPost;

    if (input.translations.length > 0) {
      const { error: trErr } = await supabase.from("translations").insert(
        input.translations.map((t) => ({
          post_id: dbPost.id,
          language: t.language,
          title: t.title,
          content: t.content,
        }))
      );
      throwIfError(trErr, "createPost:translations");
    }

    return mapPost({ ...dbPost, translations: input.translations.map((t) => ({ ...t, post_id: dbPost.id })) });
  }

  async deletePost(id: string): Promise<void> {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    throwIfError(error, "deletePost");
  }

  // ---- polls ----

  async getPollByPostId(postId: string): Promise<Poll | null> {
    const { data, error } = await supabase
      .from("polls")
      .select("*, poll_options(*)")
      .eq("post_id", postId)
      .maybeSingle();
    throwIfError(error, "getPollByPostId");
    return data ? mapPoll(data as DBPoll) : null;
  }

  async createPoll(input: Omit<Poll, "id">): Promise<Poll> {
    const { data: poll, error: pollErr } = await supabase
      .from("polls")
      .insert({
        post_id: input.postId,
        question: input.question,
        question_translations: input.questionTranslations ?? {},
        multi_select: input.multiSelect,
        closes_at: input.closesAt,
      })
      .select()
      .single();
    throwIfError(pollErr, "createPoll:poll");

    const dbPoll = poll as DBPoll;

    if (input.options.length > 0) {
      const { error: optErr } = await supabase.from("poll_options").insert(
        input.options.map((o) => ({
          id: o.id,
          poll_id: dbPoll.id,
          label: o.label,
          label_translations: o.labelTranslations ?? {},
          position: o.position,
        }))
      );
      throwIfError(optErr, "createPoll:options");
    }

    return mapPoll({
      ...dbPoll,
      poll_options: input.options.map((o) => ({
        ...o,
        poll_id: dbPoll.id,
        label_translations: o.labelTranslations ?? {},
      })),
    });
  }

  async hasVoted(pollId: string, studentId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from("poll_votes")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", pollId)
      .eq("student_id", studentId);
    throwIfError(error, "hasVoted");
    return (count ?? 0) > 0;
  }

  async vote(pollId: string, optionIds: string[], voter: Voter): Promise<void> {
    const { data: pollRow, error: pollErr } = await supabase
      .from("polls")
      .select("closes_at, multi_select")
      .eq("id", pollId)
      .single();
    throwIfError(pollErr, "vote:fetchPoll");

    const p = pollRow as { closes_at: string | null; multi_select: boolean };
    if (p.closes_at && new Date(p.closes_at).getTime() < Date.now()) {
      throw new Error("This poll is closed");
    }
    if (optionIds.length === 0) throw new Error("Select at least one option");
    if (!p.multi_select && optionIds.length > 1) {
      throw new Error("This poll only allows a single choice");
    }
    if (await this.hasVoted(pollId, voter.studentId)) {
      throw new Error("You have already voted in this poll");
    }

    const { error } = await supabase.from("poll_votes").insert(
      optionIds.map((optionId) => ({
        poll_id: pollId,
        poll_option_id: optionId,
        student_id: voter.studentId,
        nationality: voter.nationality,
      }))
    );
    throwIfError(error, "vote:insert");
  }

  async cancelVote(pollId: string, studentId: string): Promise<void> {
    const { error } = await supabase
      .from("poll_votes")
      .delete()
      .eq("poll_id", pollId)
      .eq("student_id", studentId);
    throwIfError(error, "cancelVote");
  }

  async getPollResults(pollId: string): Promise<PollResult[]> {
    const [{ data: optData, error: optErr }, { data: viewData, error: viewErr }] =
      await Promise.all([
        supabase
          .from("poll_options")
          .select("id, label, position")
          .eq("poll_id", pollId)
          .order("position"),
        supabase
          .from("poll_results_by_nationality")
          .select("poll_option_id, nationality, votes")
          .eq("poll_id", pollId),
      ]);
    throwIfError(optErr, "getPollResults:options");
    throwIfError(viewErr, "getPollResults:view");

    const rows = (viewData ?? []) as DBPollResultRow[];

    return (optData ?? []).map((opt) => {
      const byNationality = emptyByNationality();
      let total = 0;
      for (const row of rows) {
        if (row.poll_option_id !== opt.id) continue;
        if (!row.nationality) continue;
        const n = row.nationality as Nationality;
        const v = Number(row.votes);
        byNationality[n] = (byNationality[n] ?? 0) + v;
        total += v;
      }
      return {
        optionId: opt.id as string,
        label: (opt as { label: string }).label,
        byNationality,
        total,
      };
    });
  }

  async getPollTotalVoters(pollId: string): Promise<number> {
    const { data, error } = await supabase
      .from("poll_votes")
      .select("student_id")
      .eq("poll_id", pollId);
    throwIfError(error, "getPollTotalVoters");
    return new Set((data ?? []).map((v: { student_id: string }) => v.student_id)).size;
  }

  async getPollVotes(pollId: string): Promise<PollVote[]> {
    const { data, error } = await supabase
      .from("poll_votes")
      .select("*")
      .eq("poll_id", pollId)
      .order("voted_at", { ascending: true });
    throwIfError(error, "getPollVotes");
    return (data ?? []).map(
      (v: DBVote): PollVote => ({
        id: v.id,
        pollId: v.poll_id,
        optionId: v.poll_option_id,
        studentId: v.student_id,
        nationality: v.nationality as Nationality,
        votedAt: v.voted_at,
      })
    );
  }

  // ---- schedules ----

  async listSchedules(): Promise<Schedule[]> {
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .order("start_at", { ascending: true });
    throwIfError(error, "listSchedules");
    return (data ?? []).map((row: DBSchedule) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      startAt: row.start_at,
      endAt: row.end_at,
      color: row.color,
      postId: row.post_id,
      createdAt: row.created_at,
    }));
  }

  async createSchedule(
    input: Omit<Schedule, "id" | "createdAt">
  ): Promise<Schedule> {
    const { data, error } = await supabase
      .from("schedules")
      .insert({
        title: input.title,
        description: input.description,
        start_at: input.startAt,
        end_at: input.endAt,
        color: input.color,
        post_id: input.postId,
      })
      .select()
      .single();
    throwIfError(error, "createSchedule");
    const row = data as DBSchedule;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startAt: row.start_at,
      endAt: row.end_at,
      color: row.color,
      postId: row.post_id,
      createdAt: row.created_at,
    };
  }

  async updateSchedule(
    id: string,
    patch: Partial<Schedule>
  ): Promise<Schedule> {
    const dbPatch: Record<string, unknown> = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.description !== undefined) dbPatch.description = patch.description;
    if (patch.startAt !== undefined) dbPatch.start_at = patch.startAt;
    if (patch.endAt !== undefined) dbPatch.end_at = patch.endAt;
    if (patch.color !== undefined) dbPatch.color = patch.color;
    if (patch.postId !== undefined) dbPatch.post_id = patch.postId;

    const { data, error } = await supabase
      .from("schedules")
      .update(dbPatch)
      .eq("id", id)
      .select()
      .single();
    throwIfError(error, "updateSchedule");
    const row = data as DBSchedule;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startAt: row.start_at,
      endAt: row.end_at,
      color: row.color,
      postId: row.post_id,
      createdAt: row.created_at,
    };
  }

  async deleteSchedule(id: string): Promise<void> {
    const { error } = await supabase.from("schedules").delete().eq("id", id);
    throwIfError(error, "deleteSchedule");
  }

  // ---- comments ----

  async listComments(postId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    throwIfError(error, "listComments");
    return (data ?? []).map(
      (row: DBComment): Comment => ({
        id: row.id,
        postId: row.post_id,
        authorId: row.author_id ?? undefined,
        authorStudentId: row.author_name ?? undefined,
        authorNationality: row.author_nationality as Nationality,
        content: row.content,
        createdAt: row.created_at,
      })
    );
  }

  async createComment(
    input: Omit<Comment, "id" | "createdAt">
  ): Promise<Comment> {
    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: input.postId,
        author_id: input.authorId ?? null,
        author_name: input.authorStudentId ?? null,
        author_nationality: input.authorNationality,
        content: input.content,
      })
      .select()
      .single();
    throwIfError(error, "createComment");
    const row = data as DBComment;
    return {
      id: row.id,
      postId: row.post_id,
      authorId: row.author_id ?? undefined,
      authorStudentId: row.author_name ?? undefined,
      authorNationality: row.author_nationality as Nationality,
      content: row.content,
      createdAt: row.created_at,
    };
  }

  async deleteComment(id: string): Promise<void> {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", id);
    throwIfError(error, "deleteComment");
  }

  // ---- notifications ----

  async listNotifications(userId: string): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    throwIfError(error, "listNotifications");
    return (data ?? []).map(
      (row: DBNotification): AppNotification => ({
        id: row.id,
        userId: row.user_id,
        type: row.type as AppNotification["type"],
        payload: row.payload,
        read: row.read,
        createdAt: row.created_at,
      })
    );
  }

  async createNotification(
    input: Omit<AppNotification, "id" | "createdAt" | "read">
  ): Promise<AppNotification> {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: input.userId,
        type: input.type,
        payload: input.payload,
      })
      .select()
      .single();
    throwIfError(error, "createNotification");
    const row = data as DBNotification;
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as AppNotification["type"],
      payload: row.payload,
      read: row.read,
      createdAt: row.created_at,
    };
  }

  async markAllRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    throwIfError(error, "markAllRead");
  }

  // ---- lottery ----

  async addLotteryWin(studentId: string): Promise<LotteryWin> {
    const { data, error } = await supabase
      .from("lottery_wins")
      .insert({ user_id: studentId })
      .select()
      .single();
    throwIfError(error, "addLotteryWin");
    const row = data as DBLotteryWin;
    return { id: row.id, studentId: row.user_id, wonAt: row.won_at, prize: row.prize };
  }

  async getLotteryWins(studentId: string): Promise<LotteryWin[]> {
    const { data, error } = await supabase
      .from("lottery_wins")
      .select("*")
      .eq("user_id", studentId)
      .order("won_at", { ascending: false });
    throwIfError(error, "getLotteryWins");
    return (data ?? []).map((row: DBLotteryWin) => ({
      id: row.id,
      studentId: row.user_id,
      wonAt: row.won_at,
      prize: row.prize,
    }));
  }
}

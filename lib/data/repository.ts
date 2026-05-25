import type {
  AppNotification,
  Comment,
  Nationality,
  Poll,
  PollResult,
  Post,
  Schedule,
  User,
} from "./types";

export interface Voter {
  studentId: string;
  nationality: Nationality;
}

/**
 * Single abstraction over the data layer. The mock implementation backs the
 * MVP with localStorage; the Supabase implementation can be swapped in via the
 * NEXT_PUBLIC_DATA_SOURCE env var without touching any consumer code.
 */
export interface DataRepository {
  // users
  findUserByStudentId(studentId: string): Promise<User | null>;
  createUser(
    input: Omit<User, "id" | "createdAt" | "isAdmin">
  ): Promise<User>;

  // posts
  listPosts(): Promise<Post[]>;
  getPost(id: string): Promise<Post | null>;
  createPost(input: Omit<Post, "id" | "createdAt">): Promise<Post>;

  // polls
  getPollByPostId(postId: string): Promise<Poll | null>;
  createPoll(input: Omit<Poll, "id">): Promise<Poll>;
  vote(pollId: string, optionIds: string[], voter: Voter): Promise<void>;
  hasVoted(pollId: string, studentId: string): Promise<boolean>;
  getPollResults(pollId: string): Promise<PollResult[]>;
  getPollTotalVoters(pollId: string): Promise<number>;

  // schedules
  listSchedules(): Promise<Schedule[]>;
  createSchedule(
    input: Omit<Schedule, "id" | "createdAt">
  ): Promise<Schedule>;
  updateSchedule(id: string, patch: Partial<Schedule>): Promise<Schedule>;
  deleteSchedule(id: string): Promise<void>;

  // comments
  listComments(postId: string): Promise<Comment[]>;
  createComment(
    input: Omit<Comment, "id" | "createdAt">
  ): Promise<Comment>;

  // notifications
  listNotifications(userId: string): Promise<AppNotification[]>;
  createNotification(
    input: Omit<AppNotification, "id" | "createdAt" | "read">
  ): Promise<AppNotification>;
  markAllRead(userId: string): Promise<void>;
}

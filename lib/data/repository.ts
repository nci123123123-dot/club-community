import type {
  AppNotification,
  Comment,
  LotteryWin,
  MyPostActivity,
  MyVoteActivity,
  Nationality,
  Poll,
  PollResult,
  PollVote,
  Post,
  Schedule,
  Translation,
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
  getUserById(id: string): Promise<User | null>;
  createUser(
    input: Omit<User, "id" | "createdAt" | "isAdmin">
  ): Promise<User>;

  // posts
  listPosts(): Promise<Post[]>;
  getPost(id: string, studentId?: string): Promise<Post | null>;
  createPost(input: Omit<Post, "id" | "createdAt">): Promise<Post>;
  deletePost(id: string): Promise<void>;
  addTranslations(postId: string, translations: Translation[]): Promise<void>;

  // polls
  getPollByPostId(postId: string): Promise<Poll | null>;
  createPoll(input: Omit<Poll, "id">): Promise<Poll>;
  vote(pollId: string, optionIds: string[], voter: Voter): Promise<void>;
  cancelVote(pollId: string, studentId: string): Promise<void>;
  hasVoted(pollId: string, studentId: string): Promise<boolean>;
  getPollResults(pollId: string): Promise<PollResult[]>;
  getPollTotalVoters(pollId: string): Promise<number>;
  getPollVotes(pollId: string): Promise<PollVote[]>;
  closePoll(pollId: string): Promise<void>;

  // schedules
  listSchedules(): Promise<Schedule[]>;
  createSchedule(
    input: Omit<Schedule, "id" | "createdAt">
  ): Promise<Schedule>;
  updateSchedule(id: string, patch: Partial<Schedule>): Promise<Schedule>;
  deleteSchedule(id: string): Promise<void>;

  // comments
  listComments(postId: string, studentId?: string): Promise<Comment[]>;
  createComment(
    input: Omit<Comment, "id" | "createdAt" | "replies">
  ): Promise<Comment>;
  deleteComment(id: string): Promise<void>;

  // notifications
  listNotifications(userId: string): Promise<AppNotification[]>;
  createNotification(
    input: Omit<AppNotification, "id" | "createdAt" | "read">
  ): Promise<AppNotification>;
  markAllRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  clearAllNotifications(userId: string): Promise<void>;

  // likes
  togglePostLike(postId: string, studentId: string): Promise<{ liked: boolean; count: number }>;
  toggleCommentLike(commentId: string, studentId: string): Promise<{ liked: boolean; count: number }>;

  // lottery
  addLotteryWin(studentId: string): Promise<LotteryWin>;
  getLotteryWins(studentId: string): Promise<LotteryWin[]>;

  // activity
  getMyPosts(userId: string): Promise<MyPostActivity[]>;
  getMyVotes(studentId: string): Promise<MyVoteActivity[]>;
}

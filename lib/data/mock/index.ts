import type { DataRepository, Voter } from "../repository";
import type {
  AppNotification,
  Comment,
  LotteryWin,
  Nationality,
  Poll,
  PollResult,
  PollVote,
  Post,
  Schedule,
  User,
} from "../types";
import { NATIONALITIES } from "../types";
import { ADMIN_STUDENT_ID } from "../../admin";
import { read, write, uid, nowIso } from "./store";

const KEY = {
  users: "cc.users",
  posts: "cc.posts",
  polls: "cc.polls",
  votes: "cc.votes",
  schedules: "cc.schedules",
  comments: "cc.comments",
  notifications: "cc.notifications",
  lotteryWins: "cc.lotteryWins",
} as const;

function emptyByNationality(): Record<Nationality, number> {
  return NATIONALITIES.reduce(
    (acc, n) => ({ ...acc, [n]: 0 }),
    {} as Record<Nationality, number>
  );
}

export interface MockRepositoryOptions {
  /** Reserved for the factory to control seeding. The constructor never seeds. */
  seed?: boolean;
}

export class MockRepository implements DataRepository {
  constructor(_options: MockRepositoryOptions = {}) {}

  // ---- users ----
  async findUserByStudentId(studentId: string): Promise<User | null> {
    const users = read<User[]>(KEY.users, []);
    return users.find((u) => u.studentId === studentId) ?? null;
  }

  async getUserById(id: string): Promise<User | null> {
    const users = read<User[]>(KEY.users, []);
    return users.find((u) => u.id === id) ?? null;
  }

  async createUser(
    input: Omit<User, "id" | "createdAt" | "isAdmin">
  ): Promise<User> {
    const existing = await this.findUserByStudentId(input.studentId);
    if (existing) return existing;
    const user: User = {
      ...input,
      id: uid(),
      isAdmin: input.studentId === ADMIN_STUDENT_ID,
      createdAt: nowIso(),
    };
    const users = read<User[]>(KEY.users, []);
    write(KEY.users, [...users, user]);
    return user;
  }

  // ---- posts ----
  async listPosts(): Promise<Post[]> {
    const posts = read<Post[]>(KEY.posts, []);
    return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getPost(id: string): Promise<Post | null> {
    const posts = read<Post[]>(KEY.posts, []);
    return posts.find((p) => p.id === id) ?? null;
  }

  async createPost(input: Omit<Post, "id" | "createdAt">): Promise<Post> {
    const post: Post = { ...input, id: uid(), createdAt: nowIso() };
    const posts = read<Post[]>(KEY.posts, []);
    write(KEY.posts, [...posts, post]);
    return post;
  }

  async deletePost(id: string): Promise<void> {
    write(KEY.posts, read<Post[]>(KEY.posts, []).filter((p) => p.id !== id));
    const polls = read<Poll[]>(KEY.polls, []);
    const deletedPollIds = new Set(
      polls.filter((p) => p.postId === id).map((p) => p.id)
    );
    write(KEY.polls, polls.filter((p) => p.postId !== id));
    write(
      KEY.votes,
      read<PollVote[]>(KEY.votes, []).filter((v) => !deletedPollIds.has(v.pollId))
    );
    write(
      KEY.comments,
      read<Comment[]>(KEY.comments, []).filter((c) => c.postId !== id)
    );
  }

  // ---- polls ----
  async getPollByPostId(postId: string): Promise<Poll | null> {
    const polls = read<Poll[]>(KEY.polls, []);
    return polls.find((p) => p.postId === postId) ?? null;
  }

  async createPoll(input: Omit<Poll, "id">): Promise<Poll> {
    const poll: Poll = { ...input, id: uid() };
    const polls = read<Poll[]>(KEY.polls, []);
    write(KEY.polls, [...polls, poll]);
    return poll;
  }

  async hasVoted(pollId: string, studentId: string): Promise<boolean> {
    const votes = read<PollVote[]>(KEY.votes, []);
    return votes.some((v) => v.pollId === pollId && v.studentId === studentId);
  }

  async vote(
    pollId: string,
    optionIds: string[],
    voter: Voter
  ): Promise<void> {
    const polls = read<Poll[]>(KEY.polls, []);
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) throw new Error("Poll not found");
    if (poll.closesAt && new Date(poll.closesAt).getTime() < Date.now()) {
      throw new Error("This poll is closed");
    }
    if (optionIds.length === 0) throw new Error("Select at least one option");
    if (!poll.multiSelect && optionIds.length > 1) {
      throw new Error("This poll only allows a single choice");
    }
    if (await this.hasVoted(pollId, voter.studentId)) {
      throw new Error("You have already voted in this poll");
    }
    const votes = read<PollVote[]>(KEY.votes, []);
    const newVotes: PollVote[] = optionIds.map((optionId) => ({
      id: uid(),
      pollId,
      optionId,
      studentId: voter.studentId,
      nationality: voter.nationality,
      votedAt: nowIso(),
    }));
    write(KEY.votes, [...votes, ...newVotes]);
  }

  async cancelVote(pollId: string, studentId: string): Promise<void> {
    const votes = read<PollVote[]>(KEY.votes, []);
    write(
      KEY.votes,
      votes.filter((v) => !(v.pollId === pollId && v.studentId === studentId))
    );
  }

  async getPollResults(pollId: string): Promise<PollResult[]> {
    const polls = read<Poll[]>(KEY.polls, []);
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return [];
    const votes = read<PollVote[]>(KEY.votes, []).filter(
      (v) => v.pollId === pollId
    );
    return poll.options
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((option) => {
        const optionVotes = votes.filter((v) => v.optionId === option.id);
        const byNationality = emptyByNationality();
        for (const v of optionVotes) {
          byNationality[v.nationality] += 1;
        }
        return {
          optionId: option.id,
          label: option.label,
          byNationality,
          total: optionVotes.length,
        };
      });
  }

  async getPollTotalVoters(pollId: string): Promise<number> {
    const votes = read<PollVote[]>(KEY.votes, []).filter(
      (v) => v.pollId === pollId
    );
    return new Set(votes.map((v) => v.studentId)).size;
  }

  async getPollVotes(pollId: string): Promise<PollVote[]> {
    return read<PollVote[]>(KEY.votes, []).filter((v) => v.pollId === pollId);
  }

  // ---- schedules ----
  async listSchedules(): Promise<Schedule[]> {
    const schedules = read<Schedule[]>(KEY.schedules, []);
    return [...schedules].sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  async createSchedule(
    input: Omit<Schedule, "id" | "createdAt">
  ): Promise<Schedule> {
    const schedule: Schedule = { ...input, id: uid(), createdAt: nowIso() };
    const schedules = read<Schedule[]>(KEY.schedules, []);
    write(KEY.schedules, [...schedules, schedule]);
    return schedule;
  }

  async updateSchedule(
    id: string,
    patch: Partial<Schedule>
  ): Promise<Schedule> {
    const schedules = read<Schedule[]>(KEY.schedules, []);
    const target = schedules.find((s) => s.id === id);
    if (!target) throw new Error("Schedule not found");
    const updated: Schedule = { ...target, ...patch, id: target.id };
    write(
      KEY.schedules,
      schedules.map((s) => (s.id === id ? updated : s))
    );
    return updated;
  }

  async deleteSchedule(id: string): Promise<void> {
    const schedules = read<Schedule[]>(KEY.schedules, []);
    write(
      KEY.schedules,
      schedules.filter((s) => s.id !== id)
    );
  }

  // ---- comments ----
  async listComments(postId: string): Promise<Comment[]> {
    const comments = read<Comment[]>(KEY.comments, []);
    return comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createComment(
    input: Omit<Comment, "id" | "createdAt">
  ): Promise<Comment> {
    const comment: Comment = { ...input, id: uid(), createdAt: nowIso() };
    const comments = read<Comment[]>(KEY.comments, []);
    write(KEY.comments, [...comments, comment]);
    return comment;
  }

  async deleteComment(id: string): Promise<void> {
    write(KEY.comments, read<Comment[]>(KEY.comments, []).filter((c) => c.id !== id));
  }

  // ---- notifications ----
  async listNotifications(userId: string): Promise<AppNotification[]> {
    const notifications = read<AppNotification[]>(KEY.notifications, []);
    return notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createNotification(
    input: Omit<AppNotification, "id" | "createdAt" | "read">
  ): Promise<AppNotification> {
    const notification: AppNotification = {
      ...input,
      id: uid(),
      read: false,
      createdAt: nowIso(),
    };
    const notifications = read<AppNotification[]>(KEY.notifications, []);
    write(KEY.notifications, [...notifications, notification]);
    return notification;
  }

  async markAllRead(userId: string): Promise<void> {
    const notifications = read<AppNotification[]>(KEY.notifications, []);
    write(
      KEY.notifications,
      notifications.map((n) =>
        n.userId === userId ? { ...n, read: true } : n
      )
    );
  }

  // ---- lottery ----
  async addLotteryWin(studentId: string): Promise<LotteryWin> {
    const win: LotteryWin = {
      id: uid(),
      studentId,
      wonAt: nowIso(),
      prize: "coffee_gift_card",
    };
    const wins = read<LotteryWin[]>(KEY.lotteryWins, []);
    write(KEY.lotteryWins, [...wins, win]);
    return win;
  }

  async getLotteryWins(studentId: string): Promise<LotteryWin[]> {
    const wins = read<LotteryWin[]>(KEY.lotteryWins, []);
    return wins
      .filter((w) => w.studentId === studentId)
      .sort((a, b) => b.wonAt.localeCompare(a.wonAt));
  }
}

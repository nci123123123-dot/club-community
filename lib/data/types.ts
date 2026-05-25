export type Language = "ko" | "ja" | "zh" | "vi" | "en";

export type Nationality = "KR" | "JP" | "CN" | "VN" | "US" | "OTHER";

export const LANGUAGES: Language[] = ["ko", "ja", "zh", "vi", "en"];

export const NATIONALITIES: Nationality[] = ["KR", "JP", "CN", "VN", "US", "OTHER"];

export interface User {
  id: string;
  studentId: string;
  displayName: string;
  nationality: Nationality;
  preferredLanguage: Language;
  isAdmin: boolean;
  createdAt: string;
}

export interface Translation {
  language: Language;
  title: string;
  content: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorNationality: Nationality;
  originalLanguage: Language;
  tags: string[];
  translations: Translation[];
  createdAt: string;
}

export interface PollOption {
  id: string;
  label: string;
  position: number;
}

export interface Poll {
  id: string;
  postId: string;
  question: string;
  multiSelect: boolean;
  closesAt: string | null;
  options: PollOption[];
}

export interface PollVote {
  id: string;
  pollId: string;
  optionId: string;
  studentId: string;
  nationality: Nationality;
  votedAt: string;
}

export interface PollResult {
  optionId: string;
  label: string;
  byNationality: Record<Nationality, number>;
  total: number;
}

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

export interface Comment {
  id: string;
  postId: string;
  authorNationality: Nationality;
  content: string;
  createdAt: string;
}

export type NotificationType =
  | "new_poll"
  | "poll_closing"
  | "new_schedule"
  | "new_comment";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  payload: Record<string, string>;
  read: boolean;
  createdAt: string;
}

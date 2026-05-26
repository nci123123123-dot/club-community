import type { User } from "./data/types";

export const ADMIN_STUDENT_ID = "20212858";

export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.isAdmin === true || user.studentId === ADMIN_STUDENT_ID;
}

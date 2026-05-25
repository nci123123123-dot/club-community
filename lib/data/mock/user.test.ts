import { describe, it, expect } from "vitest";
import { MockRepository } from "./index";

describe("user registration", () => {
  it("creates a user with generated id and default isAdmin false", async () => {
    const repo = new MockRepository({ seed: false });
    const user = await repo.createUser({
      studentId: "20250123",
      displayName: "Tanaka",
      nationality: "JP",
      preferredLanguage: "ja",
    });
    expect(user.id).toBeTruthy();
    expect(user.isAdmin).toBe(false);
    expect(user.studentId).toBe("20250123");
  });

  it("prevents duplicate student id registration", async () => {
    const repo = new MockRepository({ seed: false });
    await repo.createUser({
      studentId: "20250123",
      displayName: "Tanaka",
      nationality: "JP",
      preferredLanguage: "ja",
    });
    await expect(
      repo.createUser({
        studentId: "20250123",
        displayName: "Other",
        nationality: "KR",
        preferredLanguage: "ko",
      })
    ).rejects.toThrow(/exists/i);
  });

  it("finds a user by student id", async () => {
    const repo = new MockRepository({ seed: false });
    await repo.createUser({
      studentId: "20250123",
      displayName: "Tanaka",
      nationality: "JP",
      preferredLanguage: "ja",
    });
    const found = await repo.findUserByStudentId("20250123");
    expect(found?.displayName).toBe("Tanaka");
    expect(await repo.findUserByStudentId("nope")).toBeNull();
  });
});

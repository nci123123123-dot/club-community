import { describe, it, expect, beforeEach } from "vitest";
import { MockRepository } from "./index";

describe("poll voting", () => {
  let repo: MockRepository;
  let pollId: string;

  beforeEach(async () => {
    repo = new MockRepository({ seed: false });
    const post = await repo.createPost({
      authorId: "a",
      authorNationality: "KR",
      originalLanguage: "ko",
      tags: [],
      translations: [],
    });
    const poll = await repo.createPoll({
      postId: post.id,
      question: "올래?",
      multiSelect: false,
      closesAt: null,
      options: [
        { id: "o1", label: "가능", position: 0 },
        { id: "o2", label: "불가", position: 1 },
      ],
    });
    pollId = poll.id;
  });

  it("aggregates votes by nationality, never exposing student ids", async () => {
    await repo.vote(pollId, ["o1"], { studentId: "1", nationality: "KR" });
    await repo.vote(pollId, ["o1"], { studentId: "2", nationality: "JP" });
    await repo.vote(pollId, ["o2"], { studentId: "3", nationality: "VN" });

    const results = await repo.getPollResults(pollId);
    const o1 = results.find((r) => r.optionId === "o1")!;
    expect(o1.byNationality.KR).toBe(1);
    expect(o1.byNationality.JP).toBe(1);
    expect(o1.total).toBe(2);

    const o2 = results.find((r) => r.optionId === "o2")!;
    expect(o2.byNationality.VN).toBe(1);
    expect(o2.total).toBe(1);

    expect(JSON.stringify(results)).not.toContain("studentId");
  });

  it("blocks a duplicate vote by the same student id", async () => {
    await repo.vote(pollId, ["o1"], { studentId: "1", nationality: "KR" });
    await expect(
      repo.vote(pollId, ["o2"], { studentId: "1", nationality: "KR" })
    ).rejects.toThrow(/already voted/i);
    expect(await repo.getPollTotalVoters(pollId)).toBe(1);
  });

  it("rejects multiple options when multiSelect is false", async () => {
    await expect(
      repo.vote(pollId, ["o1", "o2"], { studentId: "3", nationality: "CN" })
    ).rejects.toThrow(/single/i);
  });

  it("hasVoted reflects voting state", async () => {
    expect(await repo.hasVoted(pollId, "1")).toBe(false);
    await repo.vote(pollId, ["o1"], { studentId: "1", nationality: "KR" });
    expect(await repo.hasVoted(pollId, "1")).toBe(true);
  });
});

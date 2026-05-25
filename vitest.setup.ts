import { beforeEach } from "vitest";
import { resetStore } from "@/lib/data/mock/store";

// Each test starts from a clean persisted state so the mock repository does
// not leak data across tests, regardless of whether a functional localStorage
// is available in the environment.
beforeEach(() => {
  resetStore();
});

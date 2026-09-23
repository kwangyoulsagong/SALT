import { describe, expect, it } from "vitest";

import {
  readGenerationOutcome,
  type CoachGenerationStatus,
} from "./coachReport";

const accepted = {
  requestId: "req-1",
  requestedAt: "2026-09-23T01:00:00.000Z",
};

const status = (
  lastRequest: CoachGenerationStatus["lastRequest"],
  inProgress = false,
): CoachGenerationStatus => ({
  lastGeneratedAt: null,
  lastRequest,
  inProgress,
  cooldownSeconds: 300,
  retryAfterSeconds: 0,
});

describe("readGenerationOutcome", () => {
  it("내 요청이 끝났으면 성공 · 실패를 그대로 읽는다", () => {
    expect(
      readGenerationOutcome(
        status({ requestedAt: accepted.requestedAt, source: "manual", status: "succeeded" }),
        accepted,
      ),
    ).toBe("succeeded");
    expect(
      readGenerationOutcome(
        status({ requestedAt: accepted.requestedAt, source: "manual", status: "failed" }),
        accepted,
      ),
    ).toBe("failed");
  });

  it("내 요청이 아직 돌면 pending", () => {
    expect(
      readGenerationOutcome(
        status({ requestedAt: accepted.requestedAt, source: "manual", status: "running" }),
        accepted,
      ),
    ).toBe("pending");
  });

  it("그 사이 워커 행이 오면 그 성공을 내 성공으로 읽지 않는다", () => {
    const worker = {
      requestedAt: "2026-09-23T01:00:05.000Z",
      source: "worker" as const,
      status: "succeeded" as const,
    };
    // 아직 무언가 돈다 — 기다린다
    expect(readGenerationOutcome(status(worker, true), accepted)).toBe("pending");
    // 아무것도 돌지 않는다 — 끝났지만 성공인지는 모른다
    expect(readGenerationOutcome(status(worker, false), accepted)).toBe("settled");
  });

  it("아직 행이 안 보이고 진행 중이면 pending", () => {
    expect(readGenerationOutcome(status(null, true), accepted)).toBe("pending");
  });
});

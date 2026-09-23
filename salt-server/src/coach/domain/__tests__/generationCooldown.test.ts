import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cooldownRemainingSeconds,
  summarizeGenerationStatus,
  type CoachGenerationEntry,
} from "../policy";

/** 재생성 쿨다운 · 생성 상태 (`SRV-REQ-024` FR-80~84 · `SRV-REQ-025` FR-10). */

const T0 = new Date("2026-09-23T00:00:00Z");
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000);

const entry = (over: Partial<CoachGenerationEntry>): CoachGenerationEntry => ({
  id: "x",
  requestedAt: T0,
  source: "manual",
  status: "succeeded",
  llmSource: "rule",
  durationMs: 100,
  errorCode: null,
  ...over,
});

describe("cooldownRemainingSeconds", () => {
  it("기록이 없으면 0 이다", () => {
    assert.equal(cooldownRemainingSeconds(null, T0, 300), 0);
  });

  it("남은 시간을 올림한 초로 준다", () => {
    assert.equal(cooldownRemainingSeconds(T0, at(60.2), 300), 240);
    assert.equal(cooldownRemainingSeconds(T0, at(299.5), 300), 1);
  });

  it("쿨다운이 지나면 0 이다 — 음수가 아니다", () => {
    assert.equal(cooldownRemainingSeconds(T0, at(300), 300), 0);
    assert.equal(cooldownRemainingSeconds(T0, at(3600), 300), 0);
  });
});

describe("summarizeGenerationStatus", () => {
  it("거부 행은 마지막 요청으로 보이지 않는다", () => {
    const view = summarizeGenerationStatus({
      recent: [
        entry({ requestedAt: at(90), status: "cooldown_rejected" }),
        entry({ requestedAt: at(0), status: "succeeded" }),
      ],
      lastAcceptedManualAt: T0,
      now: at(100),
      cooldownSeconds: 300,
    });

    assert.equal(view.lastRequest?.status, "succeeded");
    assert.equal(view.lastGeneratedAt, T0.toISOString());
    assert.equal(view.retryAfterSeconds, 200);
  });

  it("마지막 성공은 워커 · 수동을 가리지 않고, 실패는 성공 시각을 바꾸지 않는다", () => {
    const view = summarizeGenerationStatus({
      recent: [
        entry({ requestedAt: at(600), status: "failed", source: "manual" }),
        entry({ requestedAt: at(0), status: "succeeded", source: "worker" }),
      ],
      lastAcceptedManualAt: at(600),
      now: at(700),
      cooldownSeconds: 300,
    });

    assert.equal(view.lastGeneratedAt, T0.toISOString());
    assert.equal(view.lastRequest?.status, "failed");
    assert.equal(view.retryAfterSeconds, 200, "실패한 요청도 쿨다운을 건다");
  });

  it("10분 넘게 끝나지 않은 생성은 진행 중으로 보지 않는다", () => {
    const running = entry({ status: "running", requestedAt: T0 });

    const fresh = summarizeGenerationStatus({
      recent: [running], lastAcceptedManualAt: T0, now: at(30), cooldownSeconds: 300,
    });
    const stale = summarizeGenerationStatus({
      recent: [running], lastAcceptedManualAt: T0, now: at(601), cooldownSeconds: 300,
    });

    assert.equal(fresh.inProgress, true);
    assert.equal(stale.inProgress, false);
  });

  it("기록이 없으면 전부 비고 바로 누를 수 있다", () => {
    const view = summarizeGenerationStatus({
      recent: [], lastAcceptedManualAt: null, now: T0, cooldownSeconds: 300,
    });

    assert.deepEqual(view, {
      lastGeneratedAt: null,
      lastRequest: null,
      inProgress: false,
      cooldownSeconds: 300,
      retryAfterSeconds: 0,
    });
  });
});

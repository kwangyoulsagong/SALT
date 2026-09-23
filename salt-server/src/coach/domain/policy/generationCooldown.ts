/**
 * 코치 추천 재생성 쿨다운 · 생성 상태 (`SRV-REQ-024` FR-80~84 · `SRV-REQ-025` FR-10).
 *
 * ## 무엇이 쿨다운을 거는가
 *
 * **받아들인 수동 요청**(`source = manual`, 거부가 아닌 것)의 요청 시각이다.
 * - 워커 생성은 걸지 않는다(FR-83) — 10분 주기가 사용자 버튼을 막으면 안 된다
 * - 거부된 요청은 걸지 않는다 — 거부를 기준으로 삼으면 연타가 쿨다운을 무한히 늘린다
 * - 실패한 요청은 **건다** — 실패가 쿨다운을 풀면 실패하는 생성을 연타로 반복하게 된다
 */

export type CoachGenerationSource = "worker" | "manual";

export type CoachGenerationStatus =
  | "running"
  | "succeeded"
  | "failed"
  | "cooldown_rejected";

export interface CoachGenerationEntry {
  id: string;
  requestedAt: Date;
  source: CoachGenerationSource;
  status: CoachGenerationStatus;
  llmSource: "llm" | "rule" | null;
  durationMs: number | null;
  errorCode: string | null;
}

/**
 * 이보다 오래된 `running` 은 진행 중으로 보지 않는다. 생성은 비동기라 프로세스가 도중에 죽으면
 * 행이 `running` 으로 남는다 — 그 행이 화면을 영원히 "생성 중"으로 붙잡지 않게.
 * 생성 예산(6s p95 — `performance-server.md` §1)의 100배다.
 */
export const STALE_RUNNING_MS = 10 * 60 * 1000;

/** 남은 쿨다운 — **올림한 초**. 0 이면 지금 받을 수 있다. */
export const cooldownRemainingSeconds = (
  lastAcceptedManualAt: Date | null,
  now: Date,
  cooldownSeconds: number
): number => {
  if (!lastAcceptedManualAt) return 0;
  const elapsedMs = now.getTime() - lastAcceptedManualAt.getTime();
  return Math.max(0, Math.ceil((cooldownSeconds * 1000 - elapsedMs) / 1000));
};

export const isGenerationInProgress = (
  entry: CoachGenerationEntry,
  now: Date
): boolean =>
  entry.status === "running" &&
  now.getTime() - entry.requestedAt.getTime() < STALE_RUNNING_MS;

export interface CoachGenerationStatusView {
  /** 마지막으로 **성공한** 생성의 요청 시각. 워커 · 수동 무관 */
  lastGeneratedAt: string | null;
  /** 마지막 요청(거부 제외)의 시각 · 상태 */
  lastRequest: {
    requestedAt: string;
    source: CoachGenerationSource;
    status: CoachGenerationStatus;
  } | null;
  inProgress: boolean;
  cooldownSeconds: number;
  /** 지금 수동 재생성을 누르면 기다려야 할 초. 0 이면 누를 수 있다 */
  retryAfterSeconds: number;
}

/**
 * 최근 기록(최신순) → 화면 상태. 거부 행은 "마지막 요청"으로 보이지 않는다 —
 * 버튼을 한 번 더 눌렀다고 방금 끝난 생성의 상태가 가려지면 안 된다.
 */
export const summarizeGenerationStatus = (input: {
  recent: CoachGenerationEntry[];
  lastAcceptedManualAt: Date | null;
  now: Date;
  cooldownSeconds: number;
}): CoachGenerationStatusView => {
  const accepted = input.recent.filter(
    (entry) => entry.status !== "cooldown_rejected"
  );
  const lastSucceeded = accepted.find((entry) => entry.status === "succeeded");
  const last = accepted[0] ?? null;

  return {
    lastGeneratedAt: lastSucceeded?.requestedAt.toISOString() ?? null,
    lastRequest: last
      ? {
          requestedAt: last.requestedAt.toISOString(),
          source: last.source,
          status: last.status,
        }
      : null,
    inProgress: accepted.some((entry) =>
      isGenerationInProgress(entry, input.now)
    ),
    cooldownSeconds: input.cooldownSeconds,
    retryAfterSeconds: cooldownRemainingSeconds(
      input.lastAcceptedManualAt,
      input.now,
      input.cooldownSeconds
    ),
  };
};

import { logger } from "../../shared/config/logger";
import {
  cooldownRemainingSeconds,
  type Clock,
  type CoachGenerationLogStore,
} from "../domain";
import type {
  GenerateCoachCommand,
  GenerateCoachRecommendation,
} from "./GenerateCoachRecommendation";

export type CoachGenerationRequestResult =
  | { accepted: true; requestId: string; requestedAt: string }
  | { accepted: false; retryAfterSeconds: number };

/**
 * 수동 재생성 요청 — **받고 바로 돌려준다**(202). 생성은 뒤에서 돈다 (`SRV-REQ-025` FR-10 ·
 * `BFF-REQ-025` FR-3 · `performance-server.md` §1 "수 초를 넘는 작업은 비동기").
 *
 * 1. 쿨다운 중이면 거부를 기록하고 남은 초를 준다 — 에러가 아니라 결과다. 429 는 presentation 이 정한다
 * 2. 받으면 **기록을 먼저 만들고**(`running`) 돌려준다. 다음 요청의 쿨다운 판정이 진행 중인 생성을 본다
 * 3. 생성은 기다리지 않는다. 끝나면 `GenerateCoachRecommendation` 이 기록을 닫는다
 *
 * 두 요청이 같은 순간에 오면 둘 다 판정을 통과할 수 있다(확인 → 기록 사이). 사용자 ≤10명 ·
 * 버튼 하나라 잠금을 두지 않았다 — 겹쳐도 생성이 두 번 도는 것이지 데이터가 깨지지 않는다
 * (추천은 `main_coach` 덮어쓰기다).
 */
export class RequestCoachGeneration {
  constructor(
    private readonly logs: CoachGenerationLogStore,
    private readonly generate: GenerateCoachRecommendation,
    private readonly cooldownSeconds: number,
    private readonly clock: Clock = () => new Date()
  ) {}

  async execute(
    userId: string,
    command: GenerateCoachCommand = {}
  ): Promise<CoachGenerationRequestResult> {
    const now = this.clock();

    const retryAfterSeconds = cooldownRemainingSeconds(
      await this.logs.lastAcceptedManualAt(userId),
      now,
      this.cooldownSeconds
    );

    if (retryAfterSeconds > 0) {
      await this.logs.recordRejected(userId, now);
      return { accepted: false, retryAfterSeconds };
    }

    const requestId = await this.logs.start(userId, "manual", now);

    // 기다리지 않는다. 실패는 기록이 남기고, 여기서는 삼키되 로그로 드러낸다 —
    // 처리 안 된 rejection 은 프로세스를 죽인다
    void this.generate
      .execute(userId, command, { source: "manual", logId: requestId })
      .catch((error: unknown) =>
        logger.warn(
          `코치 수동 생성 실패 (request ${requestId}): ${error instanceof Error ? error.name : "unknown"}`
        )
      );

    return { accepted: true, requestId, requestedAt: now.toISOString() };
  }
}

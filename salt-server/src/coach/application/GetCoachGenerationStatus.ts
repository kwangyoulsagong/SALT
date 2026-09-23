import {
  summarizeGenerationStatus,
  type Clock,
  type CoachGenerationLogStore,
  type CoachGenerationStatusView,
} from "../domain";

/** 최근 기록을 몇 건 보나. 워커가 10분마다 돌아 20건이면 3시간 남짓이다. */
const RECENT_LIMIT = 20;

/**
 * 마지막 생성 시각 · 진행 중 여부 · 남은 쿨다운 (`GET /api/coach/generation-status`).
 * 화면이 재생성 버튼을 언제 열지 이것으로 정한다 — 버튼을 눌러 429 를 받아 보는 대신.
 */
export class GetCoachGenerationStatus {
  constructor(
    private readonly logs: CoachGenerationLogStore,
    private readonly cooldownSeconds: number,
    private readonly clock: Clock = () => new Date()
  ) {}

  async execute(userId: string): Promise<CoachGenerationStatusView> {
    const [recent, lastAcceptedManualAt] = await Promise.all([
      this.logs.recent(userId, RECENT_LIMIT),
      this.logs.lastAcceptedManualAt(userId),
    ]);

    return summarizeGenerationStatus({
      recent,
      lastAcceptedManualAt,
      now: this.clock(),
      cooldownSeconds: this.cooldownSeconds,
    });
  }
}

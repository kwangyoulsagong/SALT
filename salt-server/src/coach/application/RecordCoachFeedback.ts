import type { CoachInsight, CoachInsightStore, CoachMode } from "../domain";

export interface RecordCoachFeedbackCommand {
  insightId?: string;
  symbol: string;
  mode: CoachMode;
  action: "followed" | "ignored" | "saved" | "dismissed";
  outcome: "unknown" | "profit" | "loss" | "breakeven";
  note?: string;
}

/**
 * 코치 판단에 대한 사용자 피드백 기록.
 *
 * ## 이것이 나중에 성적표의 분모가 된다
 *
 * 추천을 따랐는지·결과가 어땠는지가 **근거 3종의 "과거 적중률"** 을 사람이 검증할
 * 수 있게 만드는 유일한 입력이다. 그래서 덮어쓰지 않고 쌓는다 —
 * `dedupeKey` 가 매번 다른 이유다.
 *
 * `severity: 0` 은 "알릴 일이 아니다"라는 뜻이다. 기록이지 판단이 아니다.
 */
export class RecordCoachFeedback {
  constructor(private readonly insights: CoachInsightStore) {}

  execute(
    userId: string,
    command: RecordCoachFeedbackCommand
  ): Promise<CoachInsight> {
    const symbol = command.symbol.toUpperCase();

    return this.insights.saveFeedback({
      userId,
      symbol,
      title: "AI 코치 피드백",
      summary: `사용자가 ${symbol} ${command.mode} 코치 판단을 ${command.action} 처리했습니다.`,
      severity: 0,
      confidence: null,
      dedupeKey: `feedback:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      payload: {
        kind: "coach_feedback",
        insightId: command.insightId ?? null,
        symbol,
        mode: command.mode,
        action: command.action,
        outcome: command.outcome,
        note: command.note ?? null,
        recordedAt: new Date().toISOString(),
      },
      expiresAt: null,
    });
  }
}

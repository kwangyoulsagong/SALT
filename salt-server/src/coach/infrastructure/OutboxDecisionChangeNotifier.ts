import { randomUUID } from "node:crypto";

import prisma from "../../shared/infrastructure/prisma";
import type { CoachNotifier, DecisionChangeNotice } from "../domain";

/**
 * `coach` → 이벤트 `coach.DecisionChanged` (`SRV-REQ-048` FR-5, 서버 S2c).
 *
 * 전에는 `notification` 컨텍스트 공개 API 를 불러 `signal_update` 행을 직접 만들었다. 알림이 Kotlin notification 서비스로
 * 옮겨 가서(`msa-services.md` §5 — 남이 상태를 바꾼 걸 알아야 한다 = 이벤트), 여기는 **`coach.outbox` 에 행 하나**만 쓴다.
 * 플랫폼 릴레이(svc_coach)가 RabbitMQ 로 보내고, notification 이 도메인 설정 · 2시간 억제 · 금액 관문을 건다.
 *
 * - 본문은 루트 `contracts/events/coach.DecisionChanged.json` 과 같은 모양 — 테스트가 계약 파일과 맞춘다(`decisionChangedPayload`)
 * - 코드만 싣는다(종목 · 모드 · 행동). 가격 · 점수 0
 * - Express 에 브로커 클라이언트를 두지 않는다 — S6 에 coach 가 Kotlin 으로 오면 같은 표를 `OutboxWriter` 가 이어 쓴다
 */
export const DECISION_CHANGED = "coach.DecisionChanged";

export const decisionChangedPayload = (notice: DecisionChangeNotice, now: Date) => ({
  decisionId: randomUUID(),
  userId: notice.userId,
  symbol: notice.symbol,
  mode: notice.mode,
  previousAction: notice.previousAction,
  nextAction: notice.nextAction,
  changedAt: now.toISOString(),
});

export class OutboxDecisionChangeNotifier implements CoachNotifier {
  async publishDecisionChange(notice: DecisionChangeNotice): Promise<void> {
    const payload = JSON.stringify(decisionChangedPayload(notice, new Date()));
    await prisma.$executeRaw`
      INSERT INTO coach.outbox (event_id, event_type, payload, occurred_at)
      VALUES (${randomUUID()}::uuid, ${DECISION_CHANGED}, ${payload}::jsonb, now())`;
  }
}

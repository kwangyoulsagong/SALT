import type { NotificationApi } from "../../notification/application/api";
import type { CoachNotifier, DecisionChangeNotice } from "../domain";

/**
 * `coach` → `notification` ACL. 판단 변화를 **`signal_update`** 알림으로 옮긴다.
 *
 * 전에는 이 어댑터가 알림 테이블에 직접 `decision_change` 종류와 완성 문장("BTC 단타 판단이
 * … 바뀌었습니다")을 썼다. 알림은 1종이고 문장은 프론트가 만든다(`SRV-REQ-008` FR-20 · 25)
 * — 그래서 여기는 **원인 코드와 인자**만 넘긴다. 종류 · 코드 · 금액 관문은 `notification` 에 있다.
 */

/** 통보 유효 시간. 원문 그대로 24시간이다. */
const NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

const SOURCE = "ai_coach";
/** F004 추천 행동이 바뀌었다(`SRV-REQ-028` FR-90 의 첫 원인). 화면 문구 키다. */
const MESSAGE_CODE = "coach.decision_changed";

export class SignalUpdateNotifier implements CoachNotifier {
  constructor(private readonly notifications: NotificationApi) {}

  hasRecentDecisionChange(userId: string, symbol: string, since: Date): Promise<boolean> {
    return this.notifications.hasRecent({
      userId,
      source: SOURCE,
      symbol,
      messageCode: MESSAGE_CODE,
      since,
    });
  }

  async publishDecisionChange(notice: DecisionChangeNotice): Promise<void> {
    await this.notifications.publish({
      userId: notice.userId,
      kind: "signal_update",
      source: SOURCE,
      symbol: notice.symbol,
      messageCode: MESSAGE_CODE,
      params: {
        symbol: notice.symbol,
        mode: notice.mode,
        previousAction: notice.previousAction,
        nextAction: notice.nextAction,
      },
      expiresAt: new Date(Date.now() + NOTIFICATION_TTL_MS),
    });
  }
}

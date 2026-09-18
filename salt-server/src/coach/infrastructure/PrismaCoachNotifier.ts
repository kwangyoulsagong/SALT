import prisma from "../../shared/infrastructure/prisma";
import type { CoachNotifier, DecisionChangeNotice } from "../domain";

/**
 * 판단 변화 통보.
 *
 * ## 이벤트가 아닌 이유
 *
 * `notification` 컨텍스트가 **아직 없다**(FR-33). 지금 Domain Event 를 발행하면
 * 받을 쪽이 없어서 알림이 그냥 사라진다. 그래서 이 어댑터가 알림 테이블에 직접
 * 쓰고, 컨텍스트가 생기면 **이 파일 하나가 이벤트 발행으로 바뀐다** —
 * 유스케이스는 Port 만 보므로 고치지 않는다.
 */

/** 통보 유효 시간. 원문 그대로 24시간이다. */
const NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export class PrismaCoachNotifier implements CoachNotifier {
  async hasRecentDecisionChange(
    userId: string,
    symbol: string,
    since: Date
  ): Promise<boolean> {
    const row = await prisma.investmentNotification.findFirst({
      where: {
        userId,
        symbol,
        source: "ai_coach",
        type: "decision_change",
        createdAt: { gt: since },
      },
      select: { id: true },
    });

    return row !== null;
  }

  async publishDecisionChange(notice: DecisionChangeNotice): Promise<void> {
    await prisma.investmentNotification.create({
      data: {
        userId: notice.userId,
        symbol: notice.symbol,
        source: "ai_coach",
        type: "decision_change",
        title: "AI 코치 판단 변화",
        message: `${notice.symbol} ${notice.mode} 판단이 ${notice.previousAction}에서 ${notice.nextAction}로 바뀌었습니다.`,
        severity: 70,
        payload: {
          previousAction: notice.previousAction,
          nextAction: notice.nextAction,
          mode: notice.mode,
          symbol: notice.symbol,
          changedAt: new Date().toISOString(),
        },
        expiresAt: new Date(Date.now() + NOTIFICATION_TTL_MS),
      },
    });
  }
}

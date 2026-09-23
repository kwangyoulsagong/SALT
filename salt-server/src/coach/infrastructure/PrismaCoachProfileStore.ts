import prisma from "../../shared/infrastructure/prisma";
import type {
  CoachMode,
  CoachProfile,
  CoachProfileStore,
  NotificationLevel,
  RiskLevel,
} from "../domain";

/**
 * 코치 설정 저장. 테이블 이름은 `user_investment_profiles` 그대로다.
 *
 * `riskTolerance` 는 DB 에서 **자유 문자열**(`String`)이다. 도메인은 세 값만 알고,
 * 그 좁히기가 여기서 한 번 일어난다 — 모르는 값은 `medium` 으로 본다
 * (`ddd-infrastructure.md` §2).
 */
const toRiskLevel = (value: string): RiskLevel =>
  value === "low" || value === "high" ? value : "medium";

/**
 * 두 컬럼은 CHECK 가 없는 자유 문자열이다(`DB-REQ-017` FR-22). 모르는 값은 **`null`** —
 * `riskTolerance` 처럼 기본값으로 바꾸지 않는다. 고른 적 없음과 기본값 선택을 섞으면
 * 기본값이 바뀔 때 그 사용자를 옮겨야 하는지 알 수 없다.
 */
const toMode = (value: string | null): CoachMode | null =>
  value === "scalp" || value === "long_term" ? value : null;

const toNotificationLevel = (value: string | null): NotificationLevel | null =>
  value === "low" || value === "medium" || value === "high" ? value : null;

const toDomain = (row: {
  userId: string;
  riskTolerance: string;
  maxSingleAssetWeight: number;
  rebalanceBand: number;
  panicSellWindowHours: number;
  defaultMode: string | null;
  notificationLevel: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CoachProfile => ({
  userId: row.userId,
  riskTolerance: toRiskLevel(row.riskTolerance),
  maxSingleAssetWeight: row.maxSingleAssetWeight,
  rebalanceBand: row.rebalanceBand,
  panicSellWindowHours: row.panicSellWindowHours,
  defaultMode: toMode(row.defaultMode),
  notificationLevel: toNotificationLevel(row.notificationLevel),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export class PrismaCoachProfileStore implements CoachProfileStore {
  async findByUser(userId: string): Promise<CoachProfile | null> {
    const row = await prisma.userInvestmentProfile.findUnique({
      where: { userId },
    });
    return row ? toDomain(row) : null;
  }

  /**
   * 없으면 만들고 있으면 **준 값만** 덮는다.
   *
   * `undefined` 인 필드를 `update` 에 넣지 않는 것이 핵심이다 — 넣으면 Prisma 가
   * 기본값으로 덮어써서, 한 필드만 바꾸려던 요청이 나머지를 초기화한다.
   */
  async upsert(
    userId: string,
    patch: Partial<Omit<CoachProfile, "userId">>
  ): Promise<CoachProfile> {
    const data = {
      ...(patch.riskTolerance ? { riskTolerance: patch.riskTolerance } : {}),
      ...(patch.maxSingleAssetWeight !== undefined
        ? { maxSingleAssetWeight: patch.maxSingleAssetWeight }
        : {}),
      ...(patch.rebalanceBand !== undefined
        ? { rebalanceBand: patch.rebalanceBand }
        : {}),
      ...(patch.panicSellWindowHours !== undefined
        ? { panicSellWindowHours: patch.panicSellWindowHours }
        : {}),
      ...(patch.defaultMode ? { defaultMode: patch.defaultMode } : {}),
      ...(patch.notificationLevel
        ? { notificationLevel: patch.notificationLevel }
        : {}),
    };

    const row = await prisma.userInvestmentProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return toDomain(row);
  }
}

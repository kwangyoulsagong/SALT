import prisma from "../../shared/infrastructure/prisma";
import type { CoachProfile, CoachProfileStore, RiskLevel } from "../domain";

/**
 * 코치 설정 저장. 테이블 이름은 `user_investment_profiles` 그대로다.
 *
 * `riskTolerance` 는 DB 에서 **자유 문자열**(`String`)이다. 도메인은 세 값만 알고,
 * 그 좁히기가 여기서 한 번 일어난다 — 모르는 값은 `medium` 으로 본다
 * (`ddd-infrastructure.md` §2).
 */
const toRiskLevel = (value: string): RiskLevel =>
  value === "low" || value === "high" ? value : "medium";

const toDomain = (row: {
  userId: string;
  riskTolerance: string;
  maxSingleAssetWeight: number;
  rebalanceBand: number;
  panicSellWindowHours: number;
  createdAt: Date;
  updatedAt: Date;
}): CoachProfile => ({
  userId: row.userId,
  riskTolerance: toRiskLevel(row.riskTolerance),
  maxSingleAssetWeight: row.maxSingleAssetWeight,
  rebalanceBand: row.rebalanceBand,
  panicSellWindowHours: row.panicSellWindowHours,
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
    const row = await prisma.userInvestmentProfile.upsert({
      where: { userId },
      create: {
        userId,
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
      },
      update: {
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
      },
    });

    return toDomain(row);
  }
}

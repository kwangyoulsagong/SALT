import type { PortfolioApi } from "../../portfolio/application/api";
import prisma from "../../shared/infrastructure/prisma";
import type { CoachedUsersReader } from "../domain";

/**
 * `portfolio`(거래가 있는 사람) + 코치 자기 표(거래 계획 · 결정 결과가 남은 사람) → 사람마다 배치의 대상.
 * 사용자 ≤10명이라 결과는 몇 행 — 각 표의 `user_id` 인덱스 앞머리를 DISTINCT 로(행을 옮겨 오지 않는다).
 */
export class CoachedUsersAdapter implements CoachedUsersReader {
  constructor(private readonly portfolio: PortfolioApi) {}

  async userIds(): Promise<string[]> {
    const [owners, coached] = await Promise.all([
      this.portfolio.ledgerOwnerIds(),
      prisma.$queryRaw<Array<{ user_id: string }>>`
        SELECT user_id FROM trade_plans UNION SELECT user_id FROM decision_outcomes`,
    ]);
    return [...new Set([...owners, ...coached.map((row) => row.user_id)])].sort();
  }
}

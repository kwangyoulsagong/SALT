import prisma from "../../shared/infrastructure/prisma";
import { JUDGMENT_TIER_KEY, type CoachMode, type JudgmentTierMarket, type JudgmentTierReader, type JudgmentTierRow } from "../domain";

/**
 * 판단 라벨 등급 뷰 읽기(F017 v2 단계 4) — 서버는 `forecast` 를 **뷰로만** 읽는다(salt-forecast `db-contract.md` §2).
 * 요청 경로라 한 문장 · 칸 4행. 숫자를 다시 계산하지 않는다
 */
export class PrismaJudgmentTierReader implements JudgmentTierReader {
  async latest(): Promise<JudgmentTierRow[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        market: JudgmentTierMarket;
        mode: CoachMode;
        as_of: Date;
        tier: string;
        reason: string | null;
        basis_source: string | null;
        live_effective_n: number;
        live_ci_low: number | null;
        live_ci_high: number | null;
        regime_first: number | null;
        regime_second: number | null;
        backtest_ci_low: number | null;
        backtest_ci_high: number | null;
      }>
    >`
      SELECT market, mode, as_of, tier, reason, basis_source, live_effective_n, live_ci_low, live_ci_high,
             regime_first, regime_second, backtest_ci_low, backtest_ci_high
      FROM forecast.v_judgment_tier WHERE prereg_key = ${JUDGMENT_TIER_KEY}`;
    return rows.map((r) => ({
      market: r.market,
      mode: r.mode,
      asOf: r.as_of,
      tier: r.tier,
      reason: r.reason,
      basisSource: r.basis_source,
      liveEffectiveN: Number(r.live_effective_n),
      liveCiLow: r.live_ci_low,
      liveCiHigh: r.live_ci_high,
      regimeFirst: r.regime_first,
      regimeSecond: r.regime_second,
      backtestCiLow: r.backtest_ci_low,
      backtestCiHigh: r.backtest_ci_high,
    }));
  }
}

import prisma from "../../shared/infrastructure/prisma";
import type { CryptoWarningReader, CryptoWarningRow, MoveBetaReader, MoveBetaRow } from "../domain";

/**
 * 예측 배치 뷰 읽기(F016 단계 C) — 서버는 `forecast` 를 **뷰로만** 읽는다(salt-forecast `db-contract.md` §2 · `msa-services.md` §5 export 뷰).
 * Prisma 모델이 없어 `$queryRaw` · 종목 여럿을 한 문장. 예측 스키마 · 뷰가 없는 DB 면 던진다 — 유스케이스가 "없음"(β=1 · 경보 없음)으로 받는다
 */
export class PrismaMoveBetaReader implements MoveBetaReader {
  async latest(symbols: string[]) {
    const out = new Map<string, MoveBetaRow>();
    if (symbols.length === 0) return out;
    const rows = await prisma.$queryRaw<
      Array<{
        symbol: string;
        as_of: Date;
        market_index: string | null;
        sector_index: string | null;
        beta_market: number | null;
        beta_sector: number | null;
        sigma_daily: number | null;
      }>
    >`
      SELECT symbol, as_of, market_index, sector_index, beta_market, beta_sector, sigma_daily
      FROM forecast.v_move_beta_export WHERE symbol = ANY(${symbols}::text[])`;
    for (const r of rows) {
      out.set(r.symbol, {
        symbol: r.symbol,
        asOf: r.as_of,
        marketIndex: r.market_index,
        sectorIndex: r.sector_index,
        betaMarket: r.beta_market,
        betaSector: r.beta_sector,
        // 뷰는 비율(0.021) — 등락률(%)과 같은 단위로 여기서 한 번(2026-11-09 결함: 비율 그대로 넘겨 문턱이 사실상 최소 % 만 남았다)
        sigmaRate: r.sigma_daily === null ? null : r.sigma_daily * 100,
      });
    }
    return out;
  }
}

/** 업비트 유의 · 주의 매일 스냅샷(`forecast.v_market_warning`, F010 슬라이스 6) — 키 `KRW-XXX` */
export class PrismaCryptoWarningReader implements CryptoWarningReader {
  async latest(symbols: string[]) {
    const out = new Map<string, CryptoWarningRow>();
    if (symbols.length === 0) return out;
    const rows = await prisma.$queryRaw<Array<{ symbol: string; fetched_at: Date; warning: boolean; cautions: string[] }>>`
      SELECT symbol, fetched_at, warning, cautions FROM forecast.v_market_warning WHERE symbol = ANY(${symbols}::text[])`;
    for (const r of rows) out.set(r.symbol, { warning: r.warning, cautions: r.cautions, fetchedAt: r.fetched_at });
    return out;
  }
}

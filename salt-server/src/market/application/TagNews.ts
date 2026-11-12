import { logger } from "../../shared/config/logger";
import { preMoveKey, toNewsTag, type NewsOrigin, type NewsTag, type NewsTagMarket, type NewsTagReader } from "../domain";

export interface NewsTagInput {
  /** 응답 행 키(국내 일련번호 · 코인 기사 id) */
  id: string;
  /** 그 행의 종목 — 국내 코드 · 코인 심볼(대문자) */
  symbol: string;
  origin: NewsOrigin;
  /** 원천 관련 종목들 — 개수로 업종 묶음 기사를 거른다(코인은 가격 시계열이 있는 심볼만 센다) */
  related: readonly string[];
  title: string;
  publishedAt: Date;
}

/**
 * 소식 행에 측정 태그를 붙인다(F017 단계 6 · `SRV-REQ-053` FR-6). 국내 소식 · 코인 종목 뉴스가 같이 쓴다.
 * 태그는 **덧붙임** — 예측 뷰가 없거나 실패하면 빈 Map(행은 그대로, 로그 한 줄). 요청 경로는 저장값만(뷰 셋 · 캐시)
 */
export class TagNews {
  constructor(private readonly reader: NewsTagReader) {}

  async execute(market: NewsTagMarket, items: readonly NewsTagInput[]): Promise<Map<string, NewsTag>> {
    const out = new Map<string, NewsTag>();
    if (items.length === 0) return out;
    try {
      const [dict, stats, crypto] = await Promise.all([
        this.reader.dict(),
        this.reader.reactions(),
        market === "crypto" ? this.reader.cryptoSymbols() : Promise.resolve(null),
      ]);
      if (!dict) return out;
      const pre = await this.reader.preMoves(market, items.map((i) => ({ symbol: i.symbol, publishedAt: i.publishedAt })));
      for (const i of items) {
        const codes = crypto ? i.related.filter((s) => crypto.has(s.toUpperCase())).length : i.related.length;
        const tag = toNewsTag(
          dict,
          stats,
          { market, origin: i.origin, codes: Math.max(codes, 1), title: i.title },
          pre.get(preMoveKey(i.symbol, i.publishedAt)) ?? null
        );
        if (tag) out.set(i.id, tag);
      }
    } catch (error) {
      logger.warn(`소식 태그 읽기 실패(태그 없이 응답): ${(error as Error).message}`);
    }
    return out;
  }
}

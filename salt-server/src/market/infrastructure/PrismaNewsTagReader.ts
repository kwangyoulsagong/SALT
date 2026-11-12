import prisma from "../../shared/infrastructure/prisma";
import type { NewsKindDict, NewsReactionStat, NewsTagMarket, NewsTagReader } from "../domain";
import { preMoveKey } from "../domain";

/** 사전 · 서술은 하루 한 번 바뀐다(예측 매일 배치) — 10분 캐시. 바뀐 값이 화면에 늦어도 10분이다 */
const CACHE_MS = 10 * 60_000;

/**
 * `forecast.v_news_kind_dict` · `v_news_reaction` · `v_news_pre_move` 읽기(F017 단계 6 · `DB-REQ-043` FR-4) — 서버는 `forecast` 를 뷰로만 읽는다.
 * 예측 스키마 · 뷰가 없거나(예측을 안 띄운 환경) 읽기가 실패하면 **빈 값** — 소식 목록은 태그 없이 그대로 나간다(태그는 덧붙임)
 */
export class PrismaNewsTagReader implements NewsTagReader {
  private cache: { at: number; dict: NewsKindDict | null; stats: NewsReactionStat[]; crypto: ReadonlySet<string> } | null = null;

  constructor(private readonly now: () => number = () => Date.now()) {}

  private async load() {
    if (this.cache && this.now() - this.cache.at < CACHE_MS) return this.cache;
    const [dictRows, statRows, cryptoRows] = await Promise.all([
      prisma.$queryRaw<{ prereg_key: string; dict: unknown }[]>`SELECT prereg_key, dict FROM forecast.v_news_kind_dict`,
      prisma.$queryRaw<
        Array<{
          market: string; origin: string; kind: string; horizon: number; as_of: Date; status: string; sample: number;
          up_rate: number | null; mean: number | null; base_up_rate: number | null; differs: string | null;
        }>
      >`SELECT market, origin, kind, horizon::int AS horizon, as_of, status, sample, up_rate, mean, base_up_rate, differs
        FROM forecast.v_news_reaction`,
      // 코인 심볼 집합 — 선반영 표에 봉이 있는 심볼(예측이 관련 종목 수를 센 것과 같은 풀). 수백 행
      prisma.$queryRaw<{ symbol: string }[]>`SELECT DISTINCT symbol FROM forecast.v_news_pre_move WHERE market = 'crypto'`,
    ]);
    const d = dictRows[0];
    this.cache = {
      at: this.now(),
      dict: d ? toDict(d.prereg_key, d.dict) : null,
      stats: statRows.map((r) => ({
        market: r.market as NewsTagMarket,
        origin: r.origin === "disclosure" ? "disclosure" : "news",
        kind: r.kind,
        horizon: r.horizon === 5 ? 5 : 1,
        asOf: r.as_of,
        status: r.status === "ok" ? "ok" : "below_min",
        sample: r.sample,
        upRate: r.up_rate,
        mean: r.mean,
        baseUpRate: r.base_up_rate,
        differs: r.differs === "higher" || r.differs === "lower" ? r.differs : null,
      })),
      crypto: new Set(cryptoRows.map((r) => r.symbol)),
    };
    return this.cache;
  }

  async dict() {
    return (await this.load()).dict;
  }

  async reactions() {
    return (await this.load()).stats;
  }

  async cryptoSymbols() {
    return (await this.load()).crypto;
  }

  async preMoves(market: NewsTagMarket, items: ReadonlyArray<{ symbol: string; publishedAt: Date }>) {
    const out = new Map<string, number>();
    if (items.length === 0) return out;
    // 행마다 게시 시각 전 마지막 봉 하나 — PK (market, symbol, bar_at) 역순 탐색. 행 ≤ 30
    const rows = await prisma.$queryRaw<Array<{ symbol: string; published_at: Date; pre_move_5d: number }>>`
      SELECT u.symbol, u.published_at, p.pre_move_5d
      FROM unnest(${items.map((i) => i.symbol)}::text[], ${items.map((i) => i.publishedAt)}::timestamptz[]) AS u(symbol, published_at)
      JOIN LATERAL (
        SELECT pre_move_5d FROM forecast.v_news_pre_move m
        WHERE m.market = ${market} AND m.symbol = u.symbol AND m.bar_at <= u.published_at
        ORDER BY m.bar_at DESC LIMIT 1
      ) p ON true`;
    for (const r of rows) out.set(preMoveKey(r.symbol, r.published_at), r.pre_move_5d);
    return out;
  }
}

const words = (v: unknown): string[] => (Array.isArray(v) ? v.map((w) => String(w).toLowerCase()) : []);

/** jsonb → 사전. 모양이 틀린 칸은 빈 목록(분류가 덜 될 뿐 깨지지 않는다) */
const toDict = (preregKey: string, raw: unknown): NewsKindDict => {
  const d = (raw ?? {}) as { rules?: unknown; exclude?: Record<string, unknown>; news_max_codes?: unknown };
  const rules = Array.isArray(d.rules) ? d.rules : [];
  return {
    preregKey,
    rules: rules.map((r: any) => ({
      id: String(r?.id ?? ""),
      text: String(r?.text ?? r?.id ?? ""),
      markets: words(r?.markets).filter((m): m is NewsTagMarket => m === "kr" || m === "crypto"),
      include: words(r?.include),
      exclude: words(r?.exclude),
    })),
    exclude: { kr: words(d.exclude?.kr), crypto: words(d.exclude?.crypto) },
    newsMaxCodes: typeof d.news_max_codes === "number" ? d.news_max_codes : 2,
  };
};

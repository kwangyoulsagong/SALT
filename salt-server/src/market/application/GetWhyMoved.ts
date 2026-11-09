import { logger } from "../../shared/config/logger";
import {
  CRYPTO_BENCHMARK,
  cryptoMoveKey,
  isFreshMoveBeta,
  isKrStockCode,
  isKrViCodeActive,
  isKrViEventActive,
  isUsableSectorQuote,
  KR_MARKET_INDEX_OF,
  kstDateOf,
  kstStartOfDay,
  krStatusBadges,
  KrStockNotAvailableError,
  mergeMoveFacts,
  moveCardReasons,
  MOVE_FACTS_LIMIT,
  splitDailyMove,
  type CryptoWarningReader,
  type KrMarketAction,
  type KrStatusBadge,
  type MarketAssetRepository,
  type MoveBetaReader,
  type MoveBetaRow,
  type MoveCardEvents,
  type MoveCardPolicy,
  type MoveCardReason,
  type MoveFact,
  type MoveFactGroup,
  type MoveFactKind,
  type MoveSplit,
  type StoredKrStockQuote,
  type SymbolNewsPort,
  UnknownMarketSymbolError,
} from "../domain";
import { cryptoMoveEvents, freshCryptoWarning, KR_STATE_BADGES, krMoveEvents, loadBetas, type MoveDependencies } from "./moveCard";
import { KrStockRead, type KrStockReadDependencies, type KrStockViewer } from "./ReadKrStock";
import { loadKrSession } from "./SyncKrStock";

/**
 * 오늘 왜 움직였나 — ① 분해 · ② 같은 날 사실 · 카드 조건(F016 단계 C · `SRV-REQ-051` FR-7~10). 저장값만 읽는다(외부 호출 0).
 * 원인을 고르지 않는다 — 몫은 뺄셈, 사실은 시각순. 문장(③)은 단계 D 가 이 응답 위에 얹는다.
 */

/** 응답 — %p 는 응답 직전 소수 둘째 자리 한 번(합은 반올림 전에 맞다) */
export interface WhyMovedView {
  date: string;
  /** 카드를 세우나 — 서버가 정한다. `false` 여도 ①②는 준다(상세의 접힌 칸 "오늘 등락 나눠 보기") */
  show: boolean;
  reasons: MoveCardReason[];
  /** 평소 하루 변동(σ, %) — "평소의 약 N배" 맥락. 모르면 `null` */
  usualRate: number | null;
  /** ① — 시장 등락을 못 읽으면 `null`(그러면 `show` 도 `false`) */
  split: (Omit<MoveSplit, "total" | "market" | "sector" | "idio"> & {
    total: number;
    market: number;
    sector: number | null;
    idio: number;
    marketIndex: string;
    sectorIndex: string | null;
    /**
     * 업종 이름(원천 값 — `전기·전자` · `제약`). 모르면 `null`(화면이 "업종"). 시장 지수 이름은 싣지 않는다 — 원천이 `종합` · `KOSDAQ` 처럼
     * 들쭉날쭉해 화면 문구(`marketIndex` → 코스피 · 코스닥 · 비트코인)가 낫다
     */
    sectorName: string | null;
  }) | null;
  facts: Array<Omit<MoveFact, "at"> & { at: string }>;
  /** 원천을 못 읽은 사실 종류 — 그 줄만 "불러오지 못했어요" */
  unavailable: MoveFactKind[];
}

const pp = (v: number) => Math.round(v * 100) / 100;

const toView = (
  date: string,
  split: (MoveSplit & { marketIndex: string; sectorIndex: string | null; sectorName: string | null }) | null,
  reasons: MoveCardReason[],
  sigma: number | null,
  merged: { facts: MoveFact[]; unavailable: MoveFactKind[] }
): WhyMovedView => ({
  date,
  // ①이 없으면 카드도 없다(`BFF-REQ-051` FR-1) — 사건이 있어도 몫을 못 보이면 "왜"를 말할 자리가 없다
  show: split !== null && reasons.length > 0,
  reasons,
  usualRate: sigma === null ? null : pp(sigma),
  split: split && {
    ...split,
    total: pp(split.total),
    market: pp(split.market),
    sector: split.sector === null ? null : pp(split.sector),
    idio: pp(split.idio),
  },
  facts: merged.facts.map((f) => ({ ...f, at: f.at.toISOString() })),
  unavailable: merged.unavailable,
});

/** 원천 하나 읽기 — 실패는 그 kind 만 `unavailable`(로그 한 줄) */
const group = async (kinds: MoveFactKind[], read: () => Promise<MoveFact[]>): Promise<MoveFactGroup> => {
  try {
    return { kinds, facts: await read() };
  } catch (error) {
    logger.warn(`등락 사실 읽기 실패(${kinds.join(",")}): ${(error as Error).message}`);
    return { kinds, facts: null };
  }
};

// ==================== 국내 ====================

export class GetKrWhyMoved extends KrStockRead {
  constructor(
    deps: KrStockReadDependencies,
    private readonly move: MoveDependencies
  ) {
    super(deps);
  }

  async execute(viewer: KrStockViewer, code: string): Promise<WhyMovedView & { code: string }> {
    this.access.assert(viewer);
    if (!isKrStockCode(code)) throw new KrStockNotAvailableError();
    const now = this.now();
    const [session, quote] = await Promise.all([loadKrSession(this.deps.calendar, now), this.deps.store.quote(code)]);
    if (!quote) throw new KrStockNotAvailableError();
    const today = kstDateOf(now);
    const since = kstStartOfDay(now);
    const marketIndex = KR_MARKET_INDEX_OF[quote.market] ?? "0001";
    const trading = session.session === "regular" || session.session === "closing_auction";

    const [betas, indexQuotes, actionsResult, viResult] = await Promise.all([
      loadBetas(this.move.betas, [code], now),
      this.deps.supplement.indexQuotes([marketIndex]).catch(() => []),
      this.deps.status.marketActions(today).then((a) => ({ ok: true as const, a }), () => ({ ok: false as const, a: [] })),
      this.deps.status.latestViEvents([code], since).then((v) => ({ ok: true as const, v }), () => ({ ok: false as const, v: new Map() })),
    ]);
    const beta = betas.get(code) ?? null;
    const sectorIndex = beta?.betaSector !== null && beta?.betaSector !== undefined ? beta.sectorIndex : null;
    const sectorQuote = sectorIndex
      ? (await this.deps.moveSources.sectorIndices([sectorIndex]).catch(() => [])).find((s) => s.code === sectorIndex) ?? null
      : null;
    const stockDate = kstDateOf(quote.priceUpdatedAt);
    const index = indexQuotes.find((q) => q.code === marketIndex);
    // 지수가 종목 시세보다 **오래되면**(지수 수집 멈춤) 다른 날 등락을 빼게 된다 — 그때만 막는다. 같거나 늦으면 같은 마지막 거래일 값이다
    // (~~같은 날만~~ 2026-11-09 정정: 주말 재기동 때 지수 첫 회차가 장 밖에서도 돌아 지수 시각이 토요일 · 종목은 금요일이라 주말 내내 분해가 사라졌다)
    const usableIndex = index && kstDateOf(index.updatedAt) >= stockDate ? index : null;
    const usableSector = sectorQuote && isUsableSectorQuote(sectorQuote, stockDate, trading, now) ? sectorQuote : null;

    const raw = splitDailyMove({
      total: quote.changeRate,
      marketChange: usableIndex?.changeRate ?? null,
      sectorChange: usableSector?.changeRate ?? null,
      beta: beta && { market: beta.betaMarket, sector: beta.betaSector },
    });
    const shownSector = raw && raw.sector !== null ? sectorIndex : null;
    const names = shownSector
      ? await this.deps.moveSources.indexNames([shownSector]).catch(() => new Map<string, string>())
      : new Map<string, string>();
    const split = raw && {
      ...raw,
      marketIndex,
      sectorIndex: shownSector,
      sectorName: shownSector ? (names.get(shownSector) ?? null) : null,
    };

    const vi = viResult.v.get(code) ?? null;
    const badges = krStatusBadges(quote, vi !== null && isKrViEventActive(vi, now));
    const marketActions = actionsResult.a.filter((a) => a.market === quote.market);
    const events = krMoveEvents(badges, vi !== null || isKrViCodeActive(quote.viCode), marketActions, quote.market);
    const reasons = moveCardReasons(quote.changeRate, beta?.sigmaRate ?? null, events, this.move.policy);

    const merged = mergeMoveFacts([
      await group(["news", "disclosure"], async () =>
        (await this.deps.moveSources.newsTitles(code, since, MOVE_FACTS_LIMIT)).map((n) => ({
          id: `kr-news:${n.serial}`,
          kind: n.kind,
          at: n.publishedAt,
          source: n.providerName,
          title: n.title,
          value: null,
        }))
      ),
      { kinds: ["vi"], facts: viResult.ok ? (vi ? [viFact(vi)] : []) : null },
      {
        kinds: ["market_action"],
        facts: actionsResult.ok
          ? marketActions.map((a) => ({
              id: `kr-action:${a.market}:${a.tradeDate}:${a.kind}:${a.stage}`,
              kind: "market_action" as const,
              at: a.startedAt,
              source: "KRX",
              title: `${a.kind}:${a.stage}:${a.direction}`,
              value: null,
            }))
          : null,
      },
      { kinds: ["halt", "warning"], facts: stateFacts(quote, badges, since) },
      await group(["flow"], async () => {
        const flow = await this.deps.moveSources.latestProgramFlow(code, since);
        return flow
          ? [{ id: `kr-flow:program:${flow.at.toISOString()}`, kind: "flow" as const, at: flow.at, source: "KRX", title: "program", value: Math.round(flow.netValue) }]
          : [];
      }),
    ]);

    return { code, ...toView(today, split, reasons, beta?.sigmaRate ?? null, merged) };
  }
}

const viFact = (vi: { code: string; triggeredAt: Date; kind: string | null; triggerPrice: number | null; count: number | null }): MoveFact => ({
  id: `kr-vi:${vi.code}:${vi.triggeredAt.toISOString()}`,
  kind: "vi",
  at: vi.triggeredAt,
  source: "KRX",
  // 종류 · 그날 몇 번째 — 화면이 "VI 발동(정적) · 오늘 2번째"로 읽는다
  title: `vi:${vi.kind ?? "unknown"}:${vi.count ?? 1}`,
  value: vi.triggerPrice === null ? null : Math.round(vi.triggerPrice),
});

/**
 * 종목 상태(정지 · 경보 · 관리 …)는 시각 있는 사건이 아니라 지금 상태다 — 정지는 마지막 체결 시각, 나머지는 그날 시작에 둔다
 * (시각순 목록 맨 아래 · 원천에 지정 시각이 없다)
 */
const stateFacts = (quote: StoredKrStockQuote, badges: KrStatusBadge[], since: Date): MoveFact[] => {
  const facts: MoveFact[] = [];
  const halt = badges.find((b) => b === "halted" || b === "paused");
  if (halt) {
    facts.push({ id: `kr-state:${quote.code}:${halt}`, kind: "halt", at: quote.lastTradeAt ?? quote.priceUpdatedAt, source: "KRX", title: halt, value: null });
  }
  for (const b of badges) {
    if (KR_STATE_BADGES.has(b)) facts.push({ id: `kr-state:${quote.code}:${b}`, kind: "warning", at: since, source: "KRX", title: b, value: null });
  }
  return facts;
};

// ==================== 코인 ====================


/** 코인 하루의 시작 — 업비트 등락률은 KST 09:00 기준가 대비(전일 종가)라 사실도 그 뒤부터 */
const cryptoDayStart = (now: Date): Date => {
  const start = new Date(`${kstDateOf(now)}T09:00:00+09:00`);
  return start.getTime() > now.getTime() ? new Date(start.getTime() - 86_400_000) : start;
};

/** 코인 기사 한 번에 읽는 최대 건수 — 그날 것만 남긴다 */
const CRYPTO_NEWS_SCAN = 20;

export class GetCryptoWhyMoved {
  constructor(
    private readonly assets: MarketAssetRepository,
    private readonly news: SymbolNewsPort,
    private readonly move: MoveDependencies,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** 없는 종목은 `UnknownMarketSymbolError`(404) */
  async execute(rawSymbol: string): Promise<WhyMovedView & { symbol: string }> {
    const symbol = rawSymbol.toUpperCase();
    const now = this.now();
    const benchmark = symbol === CRYPTO_BENCHMARK;
    const [quotes, betas, warnings] = await Promise.all([
      this.assets.findQuotes(benchmark ? [symbol] : [symbol, CRYPTO_BENCHMARK]),
      loadBetas(this.move.betas, [cryptoMoveKey(symbol)], now),
      this.move.warnings.latest([cryptoMoveKey(symbol)]).then(
        (m) => ({ ok: true as const, m }),
        (error) => {
          logger.warn(`코인 경보 읽기 실패: ${(error as Error).message}`);
          return { ok: false as const, m: new Map() };
        }
      ),
    ]);
    const quote = quotes.find((q) => q.symbol === symbol);
    if (!quote) throw new UnknownMarketSymbolError(symbol);
    const btc = quotes.find((q) => q.symbol === CRYPTO_BENCHMARK);
    const beta = betas.get(cryptoMoveKey(symbol)) ?? null;
    const since = cryptoDayStart(now);

    const raw =
      quote.change24h === null
        ? null
        : splitDailyMove({
            total: quote.change24h,
            marketChange: btc?.change24h ?? null,
            sectorChange: null,
            beta: beta && { market: beta.betaMarket, sector: null },
            isBenchmark: benchmark,
          });
    const split = raw && { ...raw, marketIndex: cryptoMoveKey(CRYPTO_BENCHMARK), sectorIndex: null, sectorName: null };
    const warning = freshCryptoWarning(warnings.m.get(cryptoMoveKey(symbol)), now);
    const reasons =
      quote.change24h === null ? [] : moveCardReasons(quote.change24h, beta?.sigmaRate ?? null, cryptoMoveEvents(warning), this.move.policy);

    const merged = mergeMoveFacts([
      await group(["crypto_news"], async () =>
        (await this.news.recent(symbol, CRYPTO_NEWS_SCAN))
          .filter((n) => n.publishedAt.getTime() >= since.getTime())
          .map((n) => ({ id: `crypto-news:${n.id}`, kind: "crypto_news" as const, at: n.publishedAt, source: n.source, title: n.title, value: null }))
      ),
      {
        kinds: ["crypto_warning"],
        facts: warnings.ok
          ? warning
            ? [
                ...(warning.warning ? ["warning"] : []),
                ...warning.cautions.map((c: string) => `caution:${c}`),
              ].map((title) => ({ id: `crypto-warning:${symbol}:${title}`, kind: "crypto_warning" as const, at: warning.fetchedAt, source: "UPBIT", title, value: null }))
            : []
          : null,
      },
    ]);

    return { symbol, ...toView(kstDateOf(now), split, reasons, beta?.sigmaRate ?? null, merged) };
  }
}


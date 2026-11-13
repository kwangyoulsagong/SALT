import { logger } from "../../shared/config/logger";
import {
  assembleMoveCauses,
  CRYPTO_BENCHMARK,
  CRYPTO_CAUTION_LABEL,
  CRYPTO_MARKET_NAME,
  CRYPTO_WARNING_LABEL,
  KR_FLAG_LABEL,
  KR_MARKET_NAME,
  pickCauseEvents,
  POST_MOVE_WINDOW_MINUTES,
  toAfterMove,
  toInvestorEvidence,
  type MoveCauseEvent,
  type MoveCauseInput,
  type MoveCauseView,
  type MoveEvidenceReader,
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
  type NewsOrigin,
  type NewsTagMarket,
  type MoveFactGroup,
  type MoveFactKind,
  type MoveSplit,
  type StoredKrStockQuote,
  type SymbolNewsPort,
  UnknownMarketSymbolError,
} from "../domain";
import type { TagNews } from "./TagNews";
import { cryptoMoveEvents, freshCryptoWarning, KR_STATE_BADGES, krMoveEvents, loadBetas, type MoveDependencies } from "./moveCard";
import { KrStockRead, type KrStockReadDependencies } from "./ReadKrStock";
import { loadKrSession } from "./SyncKrStock";

/**
 * 오늘 왜 움직였나 — ① 분해 · ② 같은 날 사실 · 카드 조건(F016 단계 C · `SRV-REQ-051` FR-7~10). 저장값만 읽는다(외부 호출 0).
 * 몫은 뺄셈, 사실은 시각순. ~~원인을 고르지 않는다~~ **원인은 근거로만**(2026-11-13 `ADR-009` v4) — `cause`(원인 → 근거 → 결과,
 * `MoveCause.ts`)가 받치는 근거 수로 세 단계를 정한다. 문장(③)은 단계 D 가 이 응답 위에 얹는다.
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
  /**
   * 원인 → 근거 → 결과(F017 v4 순서 1b · `SRV-REQ-053` FR-11 · 17) — 서버 계산 · LLM 0. 원인 목록은 늘 하나 이상
   * (받치는 근거가 없으면 "확인된 소식이 없어요" · 작은 움직임이면 "평소 범위 안")
   */
  cause: MoveCauseView;
}

const pp = (v: number) => Math.round(v * 100) / 100;

const toView = (
  date: string,
  split: (MoveSplit & { marketIndex: string; sectorIndex: string | null; sectorName: string | null }) | null,
  reasons: MoveCardReason[],
  sigma: number | null,
  merged: { facts: MoveFact[]; unavailable: MoveFactKind[] },
  cause: MoveCauseView
): WhyMovedView => ({
  cause,
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

/** 근거 재료 하나 읽기 — 실패 · 리더 없음은 `null`(그 근거만 빠진다 · 로그 한 줄) */
const material = async <T>(name: string, read: (() => Promise<T>) | undefined): Promise<T | null> => {
  if (!read) return null;
  try {
    return await read();
  } catch (error) {
    logger.warn(`원인 근거 재료 읽기 실패(${name}): ${(error as Error).message}`);
    return null;
  }
};

/** 같은 날 소식 → 원인 후보 재료(소식 뒤 가격을 붙여서) */
const causeEvents = async (reader: MoveEvidenceReader | undefined, symbol: string, facts: MoveFact[]): Promise<MoveCauseEvent[]> => {
  const picked = pickCauseEvents(facts);
  const prices = picked.length
    ? await material("pricesAfter", reader && (() => reader.pricesAfter(symbol, picked.map((f) => f.at), POST_MOVE_WINDOW_MINUTES)))
    : null;
  return picked.map((f) => ({
    factId: f.id,
    kind: f.kind === "disclosure" ? "disclosure" : "news",
    at: f.at,
    title: f.title,
    source: f.source,
    eventKindText: f.tag?.eventKindText ?? null,
    label: f.tag?.label ?? null,
    reaction: f.tag?.reaction ?? null,
    preMove5d: f.tag?.preMove5d ?? null,
    after: toAfterMove(f.at, prices?.get(f.at.getTime())),
  }));
};

/** 원천 하나 읽기 — 실패는 그 kind 만 `unavailable`(로그 한 줄) */
const group = async (kinds: MoveFactKind[], read: () => Promise<MoveFact[]>): Promise<MoveFactGroup> => {
  try {
    return { kinds, facts: await read() };
  } catch (error) {
    logger.warn(`등락 사실 읽기 실패(${kinds.join(",")}): ${(error as Error).message}`);
    return { kinds, facts: null };
  }
};

/** 투자자 수급의 평소를 재는 앞 거래일 수 */
const INVESTOR_USUAL_DAYS = 20;

// ==================== 국내 ====================

/**
 * 같은 날 사실 중 소식에 측정 태그(F017 단계 6) — 목록 상한으로 남은 행만 · 태그는 덧붙임(실패면 TagNews 가 빈 Map).
 * `related` = 사실 id → 원천 관련 종목(묶음 기사를 거를 때 센다)
 */
const attachNewsTags = async (
  tagNews: Pick<TagNews, "execute"> | undefined,
  market: NewsTagMarket,
  symbol: string,
  facts: MoveFact[],
  related: ReadonlyMap<string, readonly string[]>
): Promise<MoveFact[]> => {
  if (!tagNews) return facts;
  const items = facts.flatMap((f) => {
    const codes = related.get(f.id);
    return codes
      ? [{ id: f.id, symbol, origin: (f.kind === "disclosure" ? "disclosure" : "news") as NewsOrigin, related: codes, title: f.title, publishedAt: f.at }]
      : [];
  });
  if (items.length === 0) return facts;
  const tags = await tagNews.execute(market, items);
  return facts.map((f) => (related.has(f.id) ? { ...f, tag: tags.get(f.id) ?? null } : f));
};

export class GetKrWhyMoved extends KrStockRead {
  constructor(
    deps: KrStockReadDependencies,
    private readonly move: MoveDependencies
  ) {
    super(deps);
  }

  async execute(code: string): Promise<WhyMovedView & { code: string }> {
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

    const related = new Map<string, string[]>();
    const merged = mergeMoveFacts([
      await group(["news", "disclosure"], async () =>
        {
          const titles = await this.deps.moveSources.newsTitles(code, since, MOVE_FACTS_LIMIT);
          for (const n of titles) related.set(`kr-news:${n.serial}`, n.related.map((r) => r.code));
          return titles.map((n) => ({
          id: `kr-news:${n.serial}`,
          kind: n.kind,
          at: n.publishedAt,
          source: n.providerName,
          title: n.title,
          value: null,
          }));
        }
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
          ? // id 는 종목 · 거래일 — 회차(10분)마다 시각 · 값이 바뀌어도 같은 사실이다. 시각을 넣으면 ③ 인용이 10분마다 끊긴다(F016 단계 D 실측)
            [{ id: `kr-flow:program:${code}:${today}`, kind: "flow" as const, at: flow.at, source: "KRX", title: "program", value: Math.round(flow.netValue) }]
          : [];
      }),
    ]);

    const facts = await attachNewsTags(this.deps.tagNews, "kr", code, merged.facts, related);

    // 원인 → 근거 → 결과(F017 v4 순서 1b) — 재료 넷을 한 번씩(저장값만). 하나가 실패해도 그 근거만 빠진다
    const reader = this.move.evidence;
    const stockDayStart = new Date(`${stockDate}T00:00:00+09:00`);
    const [causeEventList, breadth, programUsual, investorRows] = await Promise.all([
      causeEvents(reader, code, facts),
      material("krSectorBreadth", reader && (() => reader.krSectorBreadth(code, stockDayStart))),
      material("krProgramUsual", reader && (() => reader.krProgramUsual(code, since))),
      material("investorFlows", () => this.deps.supplement.investorFlows(code, INVESTOR_USUAL_DAYS + 1)),
    ]);
    const programFact = facts.find((f) => f.kind === "flow" && f.value !== null);
    const newsRead = !merged.unavailable.includes("news");
    const cause = assembleMoveCauses({
      market: "kr",
      total: quote.changeRate,
      sigma: beta?.sigmaRate ?? null,
      split: raw && {
        market: raw.market,
        sector: raw.sector,
        idio: raw.idio,
        marketName: KR_MARKET_NAME[marketIndex] ?? "시장",
        sectorName: split?.sectorName ?? null,
        isBenchmark: false,
      },
      marketChange: usableIndex ? { rate: usableIndex.changeRate, at: usableIndex.updatedAt } : null,
      sectorChange: usableSector ? { rate: usableSector.changeRate, at: usableSector.updatedAt } : null,
      breadth,
      events: causeEventList,
      program: programFact ? { netValue: programFact.value!, at: programFact.at, usualAbs: programUsual?.usualAbs ?? null, usualDays: programUsual?.days ?? 0 } : null,
      investor: investorRows ? toInvestorEvidence(investorRows.rows) : null,
      flags: [
        ...(vi ? [{ label: KR_FLAG_LABEL.vi, at: vi.triggeredAt }] : []),
        ...badges.filter((b) => b !== "vi" && KR_FLAG_LABEL[b]).map((b) => ({ label: KR_FLAG_LABEL[b], at: null })),
      ],
      listedDays: null,
      newsCount: newsRead ? facts.filter((f) => f.kind === "news" || f.kind === "disclosure").length : null,
    } satisfies MoveCauseInput);
    return { code, ...toView(today, split, reasons, beta?.sigmaRate ?? null, { ...merged, facts }, cause) };
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
    private readonly now: () => Date = () => new Date(),
    /** 소식 측정 태그(F017 단계 6). 없으면 태그 없음(테스트) */
    private readonly tagNews?: Pick<TagNews, "execute">
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

    const related = new Map<string, string[]>();
    const merged = mergeMoveFacts([
      await group(["crypto_news"], async () => {
        const today = (await this.news.recent(symbol, CRYPTO_NEWS_SCAN)).filter((n) => n.publishedAt.getTime() >= since.getTime());
        for (const n of today) related.set(`crypto-news:${n.id}`, n.symbols ?? [symbol]);
        return today.map((n) => ({ id: `crypto-news:${n.id}`, kind: "crypto_news" as const, at: n.publishedAt, source: n.source, title: n.title, value: null }));
      }),
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

    const facts = await attachNewsTags(this.tagNews, "crypto", symbol, merged.facts, related);

    // 원인 → 근거 → 결과(코인판 `SRV-REQ-053` FR-17) — 시장 몫 · 거래소 표시 · 상장 나이 · 모은 소식. 공시 · 수급 · 업종은 없다
    const reader = this.move.evidence;
    const [events, listedAt] = await Promise.all([
      causeEvents(reader, symbol, facts),
      material("cryptoListedAt", reader && (() => reader.cryptoListedAt(symbol))),
    ]);
    const total = quote.change24h ?? 0;
    const cause = assembleMoveCauses({
      market: "crypto",
      total,
      sigma: beta?.sigmaRate ?? null,
      split: raw && { market: raw.market, sector: null, idio: raw.idio, marketName: CRYPTO_MARKET_NAME, sectorName: null, isBenchmark: benchmark },
      marketChange: !benchmark && btc?.change24h !== null && btc?.change24h !== undefined ? { rate: btc.change24h, at: btc.priceUpdatedAt } : null,
      sectorChange: null,
      breadth: null,
      events,
      program: null,
      investor: null,
      flags: warning
        ? [
            ...(warning.warning ? [{ label: CRYPTO_WARNING_LABEL, at: warning.fetchedAt as Date }] : []),
            ...warning.cautions.map((c: string) => ({ label: CRYPTO_CAUTION_LABEL[c] ?? "거래소 주의 표시", at: warning.fetchedAt as Date })),
          ]
        : [],
      listedDays: listedAt ? Math.floor((now.getTime() - listedAt.getTime()) / 86_400_000) : null,
      newsCount: merged.unavailable.includes("crypto_news") ? null : facts.filter((f) => f.kind === "crypto_news").length,
    } satisfies MoveCauseInput);
    return { symbol, ...toView(kstDateOf(now), split, reasons, beta?.sigmaRate ?? null, { ...merged, facts }, cause) };
  }
}


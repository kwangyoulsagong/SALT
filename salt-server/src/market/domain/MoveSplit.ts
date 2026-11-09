/**
 * 오늘 왜 움직였나 — ① 숫자 분해 · 카드 조건 · ② 같은 날 사실(F016 단계 C · `SRV-REQ-051` FR-7~10 · `ADR-009`).
 *
 * 원인을 **해석하지 않는다** — 등락을 시장 · 업종 · 종목 몫(%p)으로 나누는 뺄셈과, 같은 날 있었던 사실을 시각순으로 놓는 것까지.
 * 문장(③)은 단계 D(`SRV-REQ-052`). 값은 전부 %(퍼센트 포인트) — 금액이 아니다.
 */

// ==================== ① 분해 (FR-7) ====================

/**
 * 어떻게 나눴나 — `regression` 은 예측 배치의 β(`forecast.v_move_beta_export`), `market_adjusted` 는 β 를 못 읽어 β=1(시장 몫 = 지수 등락)로
 * 한 단순 계산(화면 "단순 계산" 라벨), `benchmark` 는 종목이 기준 자체(BTC — 시장 몫이 전부)
 */
export type MoveSplitMethod = "regression" | "market_adjusted" | "benchmark";

export interface MoveSplit {
  /** 오늘 등락(%) */
  total: number;
  /** 시장 몫(%p) = β_시장 × 시장 등락 */
  market: number;
  /** 업종 몫(%p) = β_업종 × (업종 − 시장). 업종이 없으면(분류 없음 · 코인) `null` */
  sector: number | null;
  /** 종목 몫(%p) = 등락 − 시장 − 업종. **뺄셈이 정의**라 합 = 등락(반올림 전 정확히) */
  idio: number;
  method: MoveSplitMethod;
}

export interface MoveSplitInput {
  total: number;
  /** 시장 등락(%) — 못 읽으면 분해하지 않는다(`null` 반환) */
  marketChange: number | null;
  /** 업종 등락(%) — 없으면 두 단(시장 → 종목) */
  sectorChange: number | null;
  /** 예측 배치 β — 없으면 β=1 · 업종 몫 없음(`market_adjusted`) */
  beta: { market: number | null; sector: number | null } | null;
  /** 종목이 시장 기준 자체(BTC) */
  isBenchmark?: boolean;
}

/**
 * 오늘 등락을 나눈다. 시장 등락을 모르면 `null` — ①이 없으면 카드도 없다(`BFF-REQ-051` FR-1). β 가 하나라도 있으면 회귀값을 쓰고,
 * 업종 β 는 업종 등락이 있을 때만 쓴다(업종 등락이 없는데 업종 β 만 있으면 그 몫은 종목 몫에 남는다 — 지어내지 않는다)
 */
export const splitDailyMove = (input: MoveSplitInput): MoveSplit | null => {
  const { total } = input;
  if (!Number.isFinite(total)) return null;
  if (input.isBenchmark) return { total, market: total, sector: null, idio: 0, method: "benchmark" };
  if (input.marketChange === null || !Number.isFinite(input.marketChange)) return null;

  const betaMarket = input.beta?.market;
  const regression = typeof betaMarket === "number" && Number.isFinite(betaMarket);
  const market = (regression ? betaMarket : 1) * input.marketChange;
  const betaSector = input.beta?.sector;
  const sector =
    regression && typeof betaSector === "number" && Number.isFinite(betaSector) && input.sectorChange !== null
      ? betaSector * (input.sectorChange - input.marketChange)
      : null;
  return { total, market, sector, idio: total - market - (sector ?? 0), method: regression ? "regression" : "market_adjusted" };
};

// ==================== 카드 조건 (FR-8) ====================

/** 카드를 세우는 정책 — 서버 설정(`MOVE_CARD_K` · `MOVE_CARD_MIN_RATE`). 값은 분포를 보고 정했다(`FEATURE-016` OQ6, 체크리스트) */
export interface MoveCardPolicy {
  /** 평소 변동(일간 σ) 몇 배부터 */
  k: number;
  /** 최소 등락(%) — σ 가 아주 작은 종목이 0.5% 에 카드를 세우지 않게 */
  minRate: number;
}

/** 카드가 선 이유 — 크기 · 그날 사건. 여럿이면 크기가 앞 */
export type MoveCardReason = "large_move" | "vi" | "market_action" | "halt" | "warning";

export interface MoveCardEvents {
  vi: boolean;
  marketAction: boolean;
  halt: boolean;
  warning: boolean;
}

/**
 * |등락| ≥ max(최소 %, k × σ) 또는 오늘 사건이 있으면 카드. σ 를 모르면(표본 부족 · 배치 전) 최소 % 만 본다 — σ 를 0 으로 두면
 * 모든 날 카드가 서고, 무한대로 두면 큰 날을 놓친다. 오른 날 · 떨어진 날 대칭(절댓값)
 */
export const moveCardReasons = (
  changeRate: number,
  sigmaRate: number | null,
  events: MoveCardEvents,
  policy: MoveCardPolicy
): MoveCardReason[] => {
  const threshold = Math.max(policy.minRate, sigmaRate !== null && Number.isFinite(sigmaRate) ? policy.k * sigmaRate : 0);
  const reasons: MoveCardReason[] = [];
  if (Number.isFinite(changeRate) && Math.abs(changeRate) >= threshold) reasons.push("large_move");
  if (events.vi) reasons.push("vi");
  if (events.marketAction) reasons.push("market_action");
  if (events.halt) reasons.push("halt");
  if (events.warning) reasons.push("warning");
  return reasons;
};

// ==================== ② 같은 날 사실 (FR-9 · 10) ====================

/** 사실 종류 — 원천 하나가 실패하면 그 kind 만 `unavailable` */
export type MoveFactKind =
  | "news"
  | "disclosure"
  | "vi"
  | "market_action"
  | "halt"
  | "warning"
  | "flow"
  | "crypto_news"
  | "crypto_warning";

/**
 * 사실 한 줄 — 시각 · 출처 · 제목/값. 해석 문장 0. `id` 는 원천 키에서 만든다(③ 인용이 가리킬 자리 — 단계 D).
 * `value` 는 숫자 사실(프로그램 순매수 원 · VI 발동가 원)일 때만 — 문장이 아니라 화면이 포맷한다
 */
export interface MoveFact {
  id: string;
  kind: MoveFactKind;
  at: Date;
  /** 출처 — 제공처 이름 · "KRX" · 거래소 이름 */
  source: string;
  /** 제목 또는 사건 코드(`vi:static` · `circuit_breaker:1` · `halt` · `warn:02` · `caution:PRICE_FLUCTUATIONS`) */
  title: string;
  value: number | null;
}

/** 한 kind 의 원천 읽기 결과 — 실패는 `null`(그 kind 를 `unavailable` 로) */
export type MoveFactGroup = { kinds: MoveFactKind[]; facts: MoveFact[] | null };

/** 사실 목록 상한 — 응답 크기. 제목이 많은 날(삼성전자 하루 약 40건)도 시각순 최근 것부터 */
export const MOVE_FACTS_LIMIT = 30;

/**
 * 여러 원천을 한 목록으로 — 최신이 앞(같은 시각이면 id 순으로 안정), 상한까지. 실패한 원천의 kind 는 따로 돌려준다.
 * 같은 id 가 두 원천에서 오면 하나로
 */
export const mergeMoveFacts = (groups: MoveFactGroup[], limit = MOVE_FACTS_LIMIT): { facts: MoveFact[]; unavailable: MoveFactKind[] } => {
  const unavailable = [...new Set(groups.filter((g) => g.facts === null).flatMap((g) => g.kinds))];
  const seen = new Set<string>();
  const facts = groups
    .flatMap((g) => g.facts ?? [])
    .filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)))
    .sort((a, b) => b.at.getTime() - a.at.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, limit);
  return { facts, unavailable };
};

// ==================== 예측 배치 β · σ 읽기 ====================

/** `forecast.v_move_beta_export` 한 행. σ 는 **%**(2.1 = 2.1%) — 뷰는 비율(0.021)이라 어댑터가 한 번 바꾼다(카드 조건 · 등락률과 같은 단위) */
export interface MoveBetaRow {
  symbol: string;
  asOf: Date;
  marketIndex: string | null;
  sectorIndex: string | null;
  betaMarket: number | null;
  betaSector: number | null;
  /** 평소 하루 변동(일간 단순수익률 표준편차, %) */
  sigmaRate: number | null;
}

/**
 * β 를 믿을 만큼 최근인가 — 배치가 며칠 멈췄으면(맥 수면 · 실패) β 는 천천히 변해 그대로 써도 되지만 σ 는 카드 조건이라 오래되면 안 된다.
 * 7일 넘은 행은 없는 것으로(β=1 · 최소 % 만)
 */
export const MOVE_BETA_MAX_AGE_DAYS = 7;
export const isFreshMoveBeta = (row: MoveBetaRow, now: Date): boolean =>
  now.getTime() - row.asOf.getTime() <= MOVE_BETA_MAX_AGE_DAYS * 86_400_000;

/** 예측 배치 β · σ 읽기 — 뷰 하나 · 종목 여럿 한 문장. 예측 스키마가 없으면 빈 맵(분해는 β=1 로 선다) */
export interface MoveBetaReader {
  latest(symbols: string[]): Promise<Map<string, MoveBetaRow>>;
}

/** 코인 거래소 유의 · 주의(공식 `market/all` 상세의 매일 스냅샷 — `forecast.v_market_warning`, F010 슬라이스 6). 키는 `KRW-XXX` */
export interface CryptoWarningRow {
  warning: boolean;
  cautions: string[];
  fetchedAt: Date;
}

/**
 * 코인 경보 읽기 — 새 열을 만들지 않고 예측 배치의 매일 스냅샷 뷰를 읽는다(`DB-REQ-041` FR-7 정정 2026-11-09: 같은 원천을 두 곳에 두지 않는다).
 * 스냅샷이 2일보다 오래되면 없는 것으로 — 지난 주의 경보를 오늘 사실로 놓지 않는다
 */
export interface CryptoWarningReader {
  latest(symbols: string[]): Promise<Map<string, CryptoWarningRow>>;
}
export const CRYPTO_WARNING_MAX_AGE_MS = 2 * 86_400_000;

/** 코인 심볼(`BTC`) → 예측 배치 · 경보 스냅샷 키(`KRW-BTC`) */
export const cryptoMoveKey = (symbol: string): string => `KRW-${symbol.toUpperCase()}`;
/** 코인 분해의 시장 기준 — BTC 자체는 시장 몫이 전부 */
export const CRYPTO_BENCHMARK = "BTC";

/** 국내 시장 → 시장 지수 코드(서킷브레이커 · 분해 시장 몫) */
export const KR_MARKET_INDEX_OF: Readonly<Record<string, string>> = { KOSPI: "0001", KOSDAQ: "1001" };

/**
 * 업종 시세를 오늘 분해에 써도 되나 — 업종은 장중 30분마다만 받는다(:15 · :45, 단계 B). 종목 · 지수는 1분이라, 오래된 업종 값으로
 * 업종 − 지수를 빼면 몫이 지어진다. 장중엔 40분 안 값만, 장 밖엔 같은 거래일 값이면 쓴다. 아니면 업종 몫 없이 두 단
 */
export const MOVE_SECTOR_MAX_AGE_MS = 40 * 60_000;
export const isUsableSectorQuote = (
  sector: { tradeDate: string; updatedAt: Date },
  stockTradeDate: string,
  trading: boolean,
  now: Date
): boolean =>
  sector.tradeDate === stockTradeDate && (!trading || now.getTime() - sector.updatedAt.getTime() <= MOVE_SECTOR_MAX_AGE_MS);

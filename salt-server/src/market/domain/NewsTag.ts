/**
 * 소식 측정 태그(F017 단계 6 · `SRV-REQ-053` FR-6 · `ADR-009` 개정 11-10) — 사건 종류 · 같은 종류 과거 초과 반응 · 선반영.
 *
 * 숫자와 사전의 주인은 예측(`forecast.v_news_kind_dict` · `v_news_reaction` · `v_news_pre_move`, 사전등록 `news-reaction@2` — @1 + 사전 한 낱말).
 * 서버는 **새 제목을 같은 사전으로 바로 분류**하고 숫자를 옮긴다. 분류는 부분 문자열 대조(정규식 아님) — 파이썬과 같은 답을
 * 공용 사례 표 `contracts/news-kind/cases.json` 이 양쪽에서 확인한다. 칩 문구의 문턱(표본 · 엇갈림)도 사전등록이 정한다 —
 * 서버 설정으로 두면 등록과 화면이 갈라진다(`SRV-REQ-053` FR-6 초안 "서버 설정" 정정).
 *
 * 호재 · 악재 단어 0 — 라벨은 측정값의 이름이다: 보통 올랐던 · 보통 내렸던 · 반응 엇갈림 · 같은 종류 n건뿐.
 */

export type NewsTagMarket = "kr" | "crypto";
export type NewsOrigin = "disclosure" | "news";
export const NEWS_KIND_OTHER = "other";

export interface NewsKindRule {
  id: string;
  text: string;
  markets: NewsTagMarket[];
  include: string[];
  exclude: string[];
}

export interface NewsKindDict {
  preregKey: string;
  rules: NewsKindRule[];
  exclude: Record<NewsTagMarket, string[]>;
  newsMaxCodes: number;
}

/** 제목 → 종류 id(못 맞히면 `other`). 파이썬 `domain/news_kind.classify` 와 같은 규칙 — 위에서부터 첫 맞음 */
export const classifyNewsKind = (
  dict: NewsKindDict,
  market: NewsTagMarket,
  origin: NewsOrigin,
  codes: number,
  title: string
): string => {
  if (origin === "news" && codes > dict.newsMaxCodes) return NEWS_KIND_OTHER;
  const t = title.toLowerCase();
  if (dict.exclude[market].some((w) => t.includes(w))) return NEWS_KIND_OTHER;
  for (const r of dict.rules) {
    if (r.markets.includes(market) && r.include.some((w) => t.includes(w)) && !r.exclude.some((w) => t.includes(w))) return r.id;
  }
  return NEWS_KIND_OTHER;
};

/** 예측이 낸 (시장, 출처, 종류, 지평) 서술 한 줄 — `v_news_reaction` */
export interface NewsReactionStat {
  market: NewsTagMarket;
  origin: NewsOrigin;
  kind: string;
  horizon: 1 | 5;
  asOf: Date;
  status: "ok" | "below_min";
  sample: number;
  upRate: number | null;
  mean: number | null;
  baseUpRate: number | null;
  differs: "higher" | "lower" | null;
}

export type NewsTagLabel = "up_usually" | "down_usually" | "mixed" | "few";

/** 칩 문구 — 사전등록 [decision] label 그대로. 1봉 지평으로만 정한다 */
export const newsTagLabel = (s: Pick<NewsReactionStat, "status" | "differs">): NewsTagLabel =>
  s.status === "below_min" ? "few" : s.differs === "higher" ? "up_usually" : s.differs === "lower" ? "down_usually" : "mixed";

export interface NewsReactionView {
  days: 1 | 5;
  /** 창이 닫힌 과거 같은 종류 사건 수(below_min 이어도 있다) */
  sample: number;
  /** 시장보다 더 오른 비율 — below_min 이면 null */
  upRate: number | null;
  /** 평균 초과 반응 — **단순 비율**(0.012 = +1.2%, 예측의 로그값을 e^x − 1 로). below_min 이면 null */
  mean: number | null;
  /** 평소(같은 시장 · 모든 종목 · 모든 날) 시장보다 더 오른 비율 */
  baseUpRate: number | null;
}

export interface NewsTag {
  eventKind: string;
  eventKindText: string;
  label: NewsTagLabel;
  reaction: NewsReactionView | null;
  reaction5d: NewsReactionView | null;
  /** 소식 전 5봉 초과 수익 — **단순 비율**(e^x − 1). 게시 전 마지막 봉까지. 봉이 없으면 null */
  preMove5d: number | null;
  asOf: string | null;
  preregKey: string;
}

/** 로그 → 단순 비율 — 화면은 퍼센트만 그린다(변환을 화면에 두지 않는다) */
const simple = (x: number | null): number | null => (x === null ? null : Math.expm1(x));

const toView = (s: NewsReactionStat | undefined): NewsReactionView | null =>
  s ? { days: s.horizon, sample: s.sample, upRate: s.upRate, mean: simple(s.mean), baseUpRate: s.baseUpRate } : null;

/**
 * 한 행의 태그. 종류가 `other` 면 `null`(행만 — 화면은 칩 없이). 종류는 맞았는데 통계가 아직 없으면(첫 배치 전)
 * 라벨 `few` · 표본 0 — 막지 않고 "아직 같은 종류 기록이 없어요"
 */
export const toNewsTag = (
  dict: NewsKindDict,
  stats: readonly NewsReactionStat[],
  item: { market: NewsTagMarket; origin: NewsOrigin; codes: number; title: string },
  preMove5d: number | null
): NewsTag | null => {
  const kind = classifyNewsKind(dict, item.market, item.origin, item.codes, item.title);
  if (kind === NEWS_KIND_OTHER) return null;
  const rule = dict.rules.find((r) => r.id === kind);
  const pick = (h: 1 | 5) => stats.find((s) => s.market === item.market && s.origin === item.origin && s.kind === kind && s.horizon === h);
  const one = pick(1);
  const five = pick(5);
  return {
    eventKind: kind,
    eventKindText: rule?.text ?? kind,
    label: one ? newsTagLabel(one) : "few",
    reaction: toView(one) ?? { days: 1, sample: 0, upRate: null, mean: null, baseUpRate: null },
    reaction5d: toView(five),
    preMove5d: simple(preMove5d),
    asOf: one?.asOf.toISOString() ?? null,
    preregKey: dict.preregKey,
  };
};

/** 예측 뷰 읽기 — **트랜잭션 밖 · 요청 경로는 저장값만**(외부 호출 0) */
export interface NewsTagReader {
  /** 가장 최근 등록 사전. 아직 없으면 null */
  dict(): Promise<NewsKindDict | null>;
  /** 최신 서술(가장 최근 등록 키) */
  reactions(): Promise<NewsReactionStat[]>;
  /** 종목 × 게시 시각 → 그 시각 전 마지막 봉의 선반영. 키 = `${symbol}|${publishedAt ISO}` */
  preMoves(market: NewsTagMarket, items: ReadonlyArray<{ symbol: string; publishedAt: Date }>): Promise<Map<string, number>>;
  /** 코인 — 가격 시계열이 있는 심볼(관련 종목 수를 예측과 같게 센다: 태깅 잡음 BIT · CEO 는 빠진다) */
  cryptoSymbols(): Promise<ReadonlySet<string>>;
}

export const preMoveKey = (symbol: string, publishedAt: Date) => `${symbol}|${publishedAt.toISOString()}`;

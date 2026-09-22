/**
 * 시장 요약 띠 (`SRV-REQ-036` · `FEATURE-006` FR-64~67).
 *
 * **무엇을 보여 줄지는 서버가 정한다.** 종목 · 태그 · 등락 금액을 프론트가 정하면 화면을 배포해야
 * 바뀌고, 금액은 프론트가 계산하게 된다(공통 수용 기준 3).
 */

/**
 * 태그. **방향을 말하지 않는다** — "급등 · 급락"이 아니다(`FEATURE-006` FR-66). 오름 · 내림은
 * 변동률의 부호가 말한다. 문구는 프론트가 코드로 매핑한다(서버는 사용자 문구를 내보내지 않는다).
 */
export enum MarketSummaryTag {
  WideMove = "wide_move",
}

/** 무엇을 요약할지 — 값은 설정(`MARKET_SUMMARY_*`)에서 온다. 코드 상수가 아니다. */
export interface MarketSummaryPolicy {
  /** 첫 심볼이 큰 차트의 대표다. 순서가 화면 순서다. */
  symbols: string[];
  /** `wide_move` 임계(24시간 변동률 %, 절댓값) */
  wideMoveRate: number;
}

/**
 * 시장 분위기 — 활성 종목 중 24시간 변동률이 오른 · 내린 · 그대로인 수. **과거 사실**이고 전망이 아니다.
 * 세는 것은 DB 가 한다(행을 옮겨 오지 않는다).
 */
export interface MarketBreadth {
  up: number;
  down: number;
  flat: number;
  total: number;
}

/** 스파크라인 — 5분봉 30개 = 2시간 30분. 투자 화면 우측 차트와 같은 조회라 거래소 캐시를 같이 쓴다. */
export const SUMMARY_SPARKLINE = { unit: 5, count: 30 } as const;
export const SUMMARY_SPARKLINE_WINDOW_MINUTES =
  SUMMARY_SPARKLINE.unit * SUMMARY_SPARKLINE.count;

export const summaryTagsOf = (
  change24h: number,
  policy: Pick<MarketSummaryPolicy, "wideMoveRate">
): MarketSummaryTag[] =>
  Math.abs(change24h) >= policy.wideMoveRate ? [MarketSummaryTag.WideMove] : [];

/**
 * 24시간 등락 **금액** — 현재가와 변동률에서 기준가(24시간 전 가격)를 되짚는다.
 *
 * 거래소 변동률은 `(현재가 - 기준가) / 기준가` 라 기준가 = 현재가 / (1 + 변동률). 저장 시세에 기준가
 * 컬럼이 없어 이렇게 구한다. **반올림하지 않는다** — 원 단위 반올림은 응답 직전 한 곳이다
 * (`ddd-presentation.md` §2). 값이 없거나 변동률이 -100% 면 `null`.
 */
export const change24hAmountOf = (
  currentPrice: number,
  change24h: number
): number | null => {
  if (!(currentPrice > 0) || !Number.isFinite(change24h) || change24h <= -100) {
    return null;
  }
  const base = currentPrice / (1 + change24h / 100);
  return currentPrice - base;
};

/** 요약 패널의 뉴스 한 줄 — 대표 종목의 최근 기사 */
export interface SummaryHeadline {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: Date;
}

/** 요약 패널 뉴스 수 — 참고 화면의 목록 세 줄 */
export const SUMMARY_HEADLINE_COUNT = 3;

/**
 * 모음 피드 제목 끝의 매체 표기(" - 동아일보")를 뗀다. 같은 기사가 매체만 바꿔 여러 번 오는 것을
 * 하나로 합치는 열쇠이기도 하다. 떼고 나서 비면 원문을 쓴다.
 */
export const headlineTitleOf = (raw: string): string => {
  const cut = raw.replace(/\s+-\s+[^-]+$/, "").trim();
  return cut || raw.trim();
};

/** 최신순을 유지하며 제목이 같은 기사는 첫 것만 남기고 `limit` 개로 자른다 */
export const pickHeadlines = <T extends { title: string }>(
  articles: T[],
  limit: number
): Array<T & { title: string }> => {
  const seen = new Set<string>();
  const picked: Array<T & { title: string }> = [];
  for (const article of articles) {
    const title = headlineTitleOf(article.title);
    if (seen.has(title)) continue;
    seen.add(title);
    picked.push({ ...article, title });
    if (picked.length >= limit) break;
  }
  return picked;
};

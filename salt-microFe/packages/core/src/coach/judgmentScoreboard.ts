/**
 * 판정 성적표 뷰모델 — `GET /api/app/coach/scoreboard` 응답 `data` (F010 슬라이스 3 · `BFF-REQ-039` FR-5).
 *
 * BFF `judgment-scoreboard.viewmodel.ts` 가 소유하는 계약의 사본이다. 신호 유형(`<mode>.<action>`)별 성적이고
 * **사용자별이 아니다** — 누가 보든 같은 표다. 표본 부족(`lowSample`)은 서버 판정이다 — 화면이 문턱을 세지 않는다.
 * 맞았던 때 · 틀렸던 때는 같은 모양 · 같은 상한이다. 목표가 · 예측 필드는 없다.
 */

import type { PerformanceClaim } from "./performanceClaim";

export interface ScoreboardCase {
  date: string;
  symbol: string;
  /** 종목 이름 · 로고(F011 슬라이스 7b). 못 찾았으면 `null` */
  name: string | null;
  logoUrl: string | null;
  /** 그룹 키 `<mode>.<action>` */
  event: string;
  outcome: "hit" | "miss";
  /** 관찰 기간 수익률 — 과거 값 */
  returnRate: number;
}

/** 수익률 구간 코드 — 막대 순서(`min < r <= max`, 양 끝 열림). 문구는 화면 i18n (서버 `RETURN_BUCKETS`) */
export const RETURN_BUCKET_CODES = ["lte_m20", "m20_m10", "m10_0", "0_p10", "p10_p20", "gte_p20"] as const;
export type ReturnBucketCode = (typeof RETURN_BUCKET_CODES)[number];

/** 관찰 기간 수익률 분포(F004 FR-33) — 과거 표본의 모양이지 앞날의 확률이 아니다. 구간 6개가 늘 다 있다 */
export interface ReturnDistribution {
  /** 그룹 관찰 기간(단타 1 · 장기 30) */
  horizonDays: number;
  buckets: Array<{ code: ReturnBucketCode; count: number }>;
  p25: number | null;
  median: number | null;
  p75: number | null;
}

export interface ScoreboardGroup {
  /** `[kr_stock.]<mode>.<action>` */
  signalType: string;
  /** 성적 출처 — `backtest` 면 과거 시세로 되돌려 채점한 모의(국내만, 실제 기록 20건 전). 합산 없음 */
  sampleOrigin: "live" | "backtest";
  /** 자산군(F011 FR-65) — 코인 옆에 국내 주식을 나란히, 합산하지 않는다. 국내 주식은 소유자에게만 온다 */
  assetClass: "crypto" | "kr_stock";
  mode: "scalp" | "long_term";
  sample: number;
  /** 표본 0 이면 `null` */
  winRate: number | null;
  avgReturn: number | null;
  worstObservedReturn: number | null;
  lowSample: boolean;
  horizonHours: number | null;
  alwaysUpRate: number | null;
  /** 적중률 − 기저율. 관망은 `null` */
  excessWinRate: number | null;
  /** 기간 · 표본 · 기준 · 빗나간 수(F009 FR-33). 서버가 옛 버전이면 `null` */
  claim: PerformanceClaim | null;
  hits: ScoreboardCase[];
  misses: ScoreboardCase[];
  /** 분포가 없거나 깨졌으면 `null` */
  returnDistribution: ReturnDistribution | null;
}

export interface JudgmentScoreboardView {
  status: "ok" | "insufficient_data";
  groups: ScoreboardGroup[];
  disclaimer: string;
  generatedAt: string | null;
}

export type JudgmentScoreboardResult = JudgmentScoreboardView | { status: "unavailable" };

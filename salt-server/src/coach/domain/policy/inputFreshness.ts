/**
 * 판정 · 비중 재료의 신선도 게이트(F010 슬라이스 7 · `SRV-REQ-024` FR-194~196).
 *
 * 재료 저장소는 **나이와 무관하게 최신 행**을 준다 — 워커가 멈추면 사흘 전 RSI 로 오늘 판정이 나간다.
 * 여기서 정한 나이를 넘은 재료는 "없음"이 아니라 "오래됨"으로 따로 센다. 점수 계산은 바꾸지 않는다
 * (사전등록 `rule-ic@1` · `mode-decision@2` 의 규칙이 그대로여야 라이브 IC 가 같은 규칙을 채점한다) —
 * **표시만 막는다.**
 *
 * 기준은 정상 갱신 주기 + 여유다(2026-10-07 로컬 실측: 1시간봉 지표 ≤ 2시간 · 일봉 ≤ 48시간 · 시세 ≤ 1분).
 */

import type { CoachMode } from "../model";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** 시세 — 워커가 매분 갱신, 읽기 경로가 10분 넘으면 다시 받는다(`ReadMarketData`). 30분이면 둘 다 멈춘 것 */
export const PRICE_STALE_AFTER_MS = 30 * MINUTE_MS;

/**
 * 모드별 지표 봉 — 봉 **시작 시각** 기준이라 정상이어도 한 봉 + 계산 지연만큼 늙어 있다.
 * 단타 1시간봉은 세 봉, 장기 일봉은 사흘(σ · 국면 읽기의 `interval '3 days'` 와 같은 선)
 */
export const INDICATOR_STALE_AFTER_MS: Record<CoachMode, number> = {
  scalp: 3 * HOUR_MS,
  long_term: 3 * DAY_MS,
};

/** forecast 일 배치 산출(σ · 국면) — 하루 한 번 UTC 자정 기준. 사흘 넘게 안 돌았으면 지금 값이 아니다 */
export const FORECAST_STALE_AFTER_MS = 3 * DAY_MS;

export type StaleInput = "price" | "technical_indicator";

export interface FreshnessInput {
  mode: CoachMode;
  priceUpdatedAt: Date | null;
  indicatorTimestamp: Date | null;
  now: Date;
}

/** 시각을 모르면(`null` · 누락) 오래됐다고 하지 않는다 */
const olderThan = (at: Date | null | undefined, limitMs: number, now: Date): boolean =>
  at != null && now.getTime() - at.getTime() > limitMs;

/**
 * 모드 하나의 오래된 재료. **없는 재료는 여기 넣지 않는다** — 그건 `missingData` 가 이미 말한다.
 * 같은 재료가 "없음"과 "오래됨" 둘로 세지면 화면이 두 번 말한다.
 */
export const staleJudgmentInputs = (input: FreshnessInput): StaleInput[] => {
  const stale: StaleInput[] = [];
  if (olderThan(input.priceUpdatedAt, PRICE_STALE_AFTER_MS, input.now)) stale.push("price");
  if (olderThan(input.indicatorTimestamp, INDICATOR_STALE_AFTER_MS[input.mode], input.now)) {
    stale.push("technical_indicator");
  }
  return stale;
};

/** 시세 하나가 비중 계산에 쓸 만큼 새로운가. 갱신 시각을 모르면 쓴다 — 모르는 것을 오래됐다고 지어내지 않는다 */
export const isPriceFresh = (priceUpdatedAt: Date | null | undefined, now: Date): boolean =>
  !olderThan(priceUpdatedAt, PRICE_STALE_AFTER_MS, now);

/** forecast 산출 시각이 오래됐나. 행이 아예 없으면 `false` — 그건 "아직 계산 안 됨"이다 */
export const isForecastStale = (asOf: Date | null, now: Date): boolean =>
  olderThan(asOf, FORECAST_STALE_AFTER_MS, now);

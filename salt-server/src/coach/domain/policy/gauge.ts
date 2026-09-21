/**
 * 게이지 아래 적중률 한 줄 (F004 · 감사 문서 B9).
 *
 * 심리 온도계가 지금 구간에 있던 **과거 날들**의 30일 뒤 수익률 분포다. "지금 이 구간이니
 * 앞으로 +X%" 가 아니다 — 필드 이름에도 그렇게 읽힐 말을 쓰지 않는다(FR-123).
 * 문장(`예측 아님` 포함)은 프론트가 만든다.
 */

export type GaugeKind = "sentiment" | "smart_money";

/** 구간 폭. **바꾸면 전체 재집계다**(`DB-REQ-017` FR-57) — 일 1회 워커가 다음 회차에 다시 쓴다. */
export const GAUGE_BUCKET_WIDTH = 20;
export const GAUGE_HORIZON_DAYS = 30;
/**
 * 표본을 보는 기간. 일봉 보관이 2년(`market` 의 `RETENTION`)이라 그 너머는 종가가 없다.
 */
export const GAUGE_LOOKBACK_DAYS = 730;
export const MIN_GAUGE_SAMPLE = 20;

const LAST_BUCKET = Math.ceil(100 / GAUGE_BUCKET_WIDTH) - 1;

export const gaugeBucketIndex = (value: number): number =>
  Math.min(Math.max(Math.floor(value / GAUGE_BUCKET_WIDTH), 0), LAST_BUCKET);

/** `0_20` · `20_40` … `80_100`. 코드이지 문구가 아니다. */
export const gaugeBucketCode = (index: number): string =>
  `${index * GAUGE_BUCKET_WIDTH}_${(index + 1) * GAUGE_BUCKET_WIDTH}`;

/** 저장된 한 줄. 수익률은 비율(0.12 = 12%)이다. */
export interface GaugeTrackStats {
  symbol: string;
  gauge: GaugeKind;
  bucketCode: string;
  horizonDays: number;
  sample: number;
  p25: number | null;
  median: number | null;
  p75: number | null;
  positiveRate: number | null;
  windowFrom: Date;
  windowTo: Date;
}

export interface GaugeTrackRecordView {
  gauge: GaugeKind;
  bucketCode: string;
  currentValue: number;
  horizonDays: number;
  sample: number;
  p25: number | null;
  median: number | null;
  p75: number | null;
  positiveRate: number | null;
  lowSample: boolean;
}

/**
 * 화면에 실을 한 줄. **표본 0 이면 `null` — 한 줄이 사라진다**(FR-122 · `SRV-REQ-025` FR-46).
 * 근거 없는 문장보다 없는 게 낫다. 1 이상 20 미만은 싣되 `lowSample` 이다.
 */
export const toGaugeTrackRecord = (
  stats: GaugeTrackStats | null,
  currentValue: number
): GaugeTrackRecordView | null => {
  if (!stats || stats.sample === 0) return null;

  return {
    gauge: stats.gauge,
    bucketCode: stats.bucketCode,
    currentValue,
    horizonDays: stats.horizonDays,
    sample: stats.sample,
    p25: stats.p25,
    median: stats.median,
    p75: stats.p75,
    positiveRate: stats.positiveRate,
    lowSample: stats.sample < MIN_GAUGE_SAMPLE,
  };
};

import type { CoachMode } from "../model";
import {
  JUDGMENT_HORIZON_MS,
  summarizeJudgmentTrack,
  type JudgmentTrackRecord,
  type JudgmentTrackStats,
} from "./symbolJudgment";

/**
 * 판단 성적표 그룹의 **수익률 분포** — F004 (감사 문서 B17 · B2).
 *
 * ## 분포는 과거 표본의 모양이지 앞날의 확률이 아니다
 *
 * 구간별 표본 수와 사분위수만 준다. "이 구간에 들 확률" 같은 말이 나올 수 있는 필드
 * (`probability` · `expectedReturn`)를 두지 않는다 (전 영역 공통 수용 기준 4).
 *
 * ## 기간은 모드가 정한다 — 30일 고정이 아니다
 *
 * 계약 초안은 `horizonDays: 30` 고정이었다. 그런데 단타 판단의 관찰 기간은 24시간이고
 * (`JUDGMENT_HORIZON_MS`) 그 표본에 "30일 수익률"이라고 쓰면 **거짓**이다. 그룹 키가
 * `<mode>.<action>` 이라 기간이 그룹마다 확정되므로, 그룹이 자기 기간을 말한다.
 */

const DAY_MS = 24 * 3600_000;

/**
 * 구간 경계. `min < returnRate <= max` 이고 양 끝은 열려 있다.
 * `m` 은 마이너스 · `p` 는 플러스이며 **코드**다 — 문구는 프론트 i18n 이 만든다.
 *
 * 경계값은 위 구간에 들어간다: −20% 정확히는 `lte_m20`, +20% 정확히는 `p10_p20` 이다.
 * SQL 집계(`PrismaSymbolJudgmentStore.scoreboard`)가 이 배열을 읽어 같은 경계로 센다 —
 * 경계가 두 곳에 있으면 화면 숫자와 DB 가 조용히 갈라진다.
 */
export interface ReturnBucket {
  code: string;
  /** 열린 아래끝은 `null`. */
  min: number | null;
  /** 열린 위끝은 `null`. */
  max: number | null;
}

export const RETURN_BUCKETS: readonly ReturnBucket[] = [
  { code: "lte_m20", min: null, max: -0.2 },
  { code: "m20_m10", min: -0.2, max: -0.1 },
  { code: "m10_0", min: -0.1, max: 0 },
  { code: "0_p10", min: 0, max: 0.1 },
  { code: "p10_p20", min: 0.1, max: 0.2 },
  { code: "gte_p20", min: 0.2, max: null },
];

/** 수익률 하나가 어느 구간인가. SQL 과 같은 경계여야 하므로 같은 배열을 본다. */
export const returnBucketCode = (returnRate: number): string => {
  const bucket = RETURN_BUCKETS.find(
    (candidate) =>
      (candidate.min === null || returnRate > candidate.min) &&
      (candidate.max === null || returnRate <= candidate.max)
  );
  // 배열이 실수선을 덮으므로 여기 오지 않는다. 덮지 못하게 고치면 터지게 둔다.
  if (!bucket) throw new Error(`구간을 못 찾았다: ${returnRate}`);
  return bucket.code;
};

/** 저장소가 SQL 로 모아 준 그룹 하나. 표본 행을 읽어 세지 않는다. */
export interface JudgmentGroupStats extends JudgmentTrackStats {
  signalType: string;
  /** 구간 코드별 표본 수. 0 인 구간도 담는다 — 막대가 비어 있는 것도 정보다. */
  bucketCounts: Record<string, number>;
  p25: number | null;
  median: number | null;
  p75: number | null;
}

export interface ReturnDistributionView {
  /** 이 그룹의 관찰 기간. 단타 1 · 장기 30. */
  horizonDays: number;
  buckets: Array<{ code: string; count: number }>;
  p25: number | null;
  median: number | null;
  p75: number | null;
}

/** 성적표 한 그룹. 판단 블록의 `trackRecord` 와 **같은 4지표**를 쓴다. */
export interface ScoreboardGroupStats extends JudgmentTrackRecord {
  returnDistribution: ReturnDistributionView;
}

/** `<mode>.<action>` 의 모드. 이 테이블은 이 모양만 쓴다 — 아니면 `null`. */
export const judgmentModeOf = (signalType: string): CoachMode | null => {
  const [mode] = signalType.split(".");
  return mode === "scalp" || mode === "long_term" ? mode : null;
};

/**
 * 그룹 집계를 화면 모양으로. **승률 · 표본 부족 판정은 판단 블록과 같은 함수**
 * (`summarizeJudgmentTrack`)를 쓴다 — 같은 숫자가 두 화면에서 달라지지 않게.
 */
export const toScoreboardGroup = (
  mode: CoachMode,
  stats: JudgmentGroupStats
): ScoreboardGroupStats => ({
  ...summarizeJudgmentTrack(mode, stats.signalType, stats),
  returnDistribution: {
    horizonDays: JUDGMENT_HORIZON_MS[mode] / DAY_MS,
    buckets: RETURN_BUCKETS.map((bucket) => ({
      code: bucket.code,
      count: stats.bucketCounts[bucket.code] ?? 0,
    })),
    p25: stats.p25,
    median: stats.median,
    p75: stats.p75,
  },
});

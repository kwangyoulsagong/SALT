import type { GaugeTrackRecord } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";

import { formatRatio, formatSignedRate } from "../lib";
import { COACH_MESSAGES } from "../model";
import { gaugeLine } from "./CoachBlock.css";
import { PerformanceClaimLine } from "./PerformanceClaimLine";

const { gauge: GAUGE } = COACH_MESSAGES;

/**
 * 게이지 아래 적중률 한 줄 (`FE-REQ-026` FR-118 · B9).
 *
 * "이 구간에 있던 **과거 날들**의 N일 뒤 수익률 분포"다. 앞으로의 수익률이 아니다 —
 * 그래서 `예측 아님` 배지가 문장과 같은 줄에 있다. 분포 값이 없으면(표본 0) 표본 수만.
 * 부르는 쪽이 항목을 못 찾으면 이 컴포넌트를 그리지 않는다.
 *
 * 기준 대비(F009 FR-33): 이 구간의 오른 비율 옆에 같은 종목 **모든 날**의 오른 비율을 둔다 — 구간이 특별한지는
 * 그 차이로만 읽는다. 분포라 빗나간 수는 없고, 4요소 줄이 그 이유를 쓴다.
 */
export const GaugeTrackRecordLine = ({ record }: { record: GaugeTrackRecord }) => {
  const { median, p25, p75 } = record;
  const distribution =
    median !== null && p25 !== null && p75 !== null
      ? GAUGE.distribution(
          record.horizonDays,
          formatSignedRate(median),
          formatSignedRate(p25),
          formatSignedRate(p75),
        )
      : null;

  const baseline =
    record.positiveRate !== null && record.baselinePositiveRate !== null
      ? GAUGE.versusBaseline(formatRatio(record.positiveRate), formatRatio(record.baselinePositiveRate))
      : null;

  return (
    <>
    <p className={gaugeLine[record.lowSample ? "lowSample" : "normal"]}>
      <span>
        {GAUGE.sample(GAUGE.bucket(record.bucketCode), record.sample)}
        {distribution && ` · ${distribution}`}
        {baseline && ` · ${baseline}`}
      </span>
      <Badge size="sm" tone="neutral">
        {COACH_MESSAGES.notPrediction}
      </Badge>
      {record.lowSample && (
        <Badge size="sm" tone="neutral">
          {COACH_MESSAGES.lowSample}
        </Badge>
      )}
    </p>
    <PerformanceClaimLine claim={record.claim} />
    </>
  );
};

export default GaugeTrackRecordLine;

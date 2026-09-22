import type { PriceLine } from "@repo/ui/previewChart";
import { Badge } from "@repo/ui/badge";

import { COACH_MESSAGES } from "../model";
import { legend, legendItem, swatch } from "./CoachDetail.css";

const swatchOf = (line: PriceLine) =>
  swatch[`${line.tone}${line.dashed ? "Dashed" : "Solid"}` as const];

/**
 * 차트 구간 선 범례 (`FE-REQ-026` FR-132). **`예측 아님` 이 범례에 늘 붙는다** — 선은
 * 과거 가격과 내 규칙이지 "여기까지 간다"가 아니다. 선이 없으면 범례도 없다.
 */
export const ZoneLegend = ({ lines }: { lines: readonly PriceLine[] }) => {
  if (lines.length === 0) return null;

  return (
    <ul className={legend} aria-label={COACH_MESSAGES.overlay.legendLabel}>
      {lines.map((line) => (
        <li key={line.key} className={legendItem}>
          <span className={swatchOf(line)} aria-hidden="true" />
          {line.label}
        </li>
      ))}
      <li>
        <Badge size="sm" tone="neutral">
          {COACH_MESSAGES.notPrediction}
        </Badge>
      </li>
    </ul>
  );
};

export default ZoneLegend;

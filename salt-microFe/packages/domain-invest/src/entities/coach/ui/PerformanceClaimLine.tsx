import type { PerformanceClaim } from "@repo/core/coach";

import { CLAIM_MESSAGES } from "../model";
import { claimItem, claimLine } from "./CoachBlock.css";

const { gap: GAP } = CLAIM_MESSAGES;

/**
 * 성적 4요소 한 줄 — 기간 · 표본 · 기준 · 빗나간 수 (F009 FR-33 · `FE-REQ-045`).
 *
 * 서비스가 자기 성적을 말하는 자리마다 이 줄이 붙는다. 칸 넷은 **항상 같은 순서로 다 그린다** — 값이 없는 칸은
 * 이유를 쓴다. 칸이 빠지면 같은 숫자가 더 좋아 보인다. `claim` 이 `null`(서버가 옛 버전)이면 그리지 않는다.
 *
 * `unit` 은 표본을 세는 말이다 — 판단 · 사건은 회, 주간 기록은 주.
 */
export const PerformanceClaimLine = ({
  claim,
  unit = "회",
}: {
  claim: PerformanceClaim | null;
  unit?: string;
}) => {
  if (!claim) return null;
  const { period, baseline, misses } = claim;
  const items = [
    period.present ? CLAIM_MESSAGES.period(period.from, period.to) : GAP.period[period.reason],
    CLAIM_MESSAGES.sample(claim.sample, unit),
    baseline.present ? CLAIM_MESSAGES.baseline[baseline.code] : GAP.baseline[baseline.reason],
    misses.present
      ? misses.outOf === claim.sample
        ? CLAIM_MESSAGES.misses(misses.count, unit)
        : CLAIM_MESSAGES.missesOutOf(misses.count, misses.outOf, unit)
      : GAP.misses[misses.reason],
  ];

  return (
    <ul className={claimLine} aria-label={CLAIM_MESSAGES.label}>
      {items.map((item, index) => (
        // 칸 순서가 고정이다(기간 · 표본 · 기준 · 빗나감) — 자리 번호가 곧 키
        <li key={index} className={claimItem}>
          {item}
        </li>
      ))}
    </ul>
  );
};

export default PerformanceClaimLine;

import { Skeleton } from "@repo/ui/skeleton";

import { judgmentSlot, zoneSlot } from "./CoachBlock.css";

/** 판단 줄 수(라벨 · 메타 · 점수 · 요약) */
const JUDGMENT_LINES = 4;
/** 구간 줄 수(제목 · 3행) */
const ZONE_LINES = 4;

/**
 * 판단 · 구간 자리의 스켈레톤. **실제 블록과 같은 최소 높이**를 쓴다 — 도착 순간 아래의
 * 게이지 · 뉴스가 밀려 내려가지 않는다(`FE-REQ-029` FR-72).
 */
export const CoachBlockSkeleton = ({ block }: { block: "judgment" | "zone" }) => (
  <div className={block === "judgment" ? judgmentSlot : zoneSlot} aria-busy="true">
    <Skeleton lines={block === "judgment" ? JUDGMENT_LINES : ZONE_LINES} />
  </div>
);

export default CoachBlockSkeleton;

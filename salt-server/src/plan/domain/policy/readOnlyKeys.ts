/**
 * 설정 저장 본문에 오면 422 `PLAN_BAND_READ_ONLY` 인 키(`SRV-REQ-020` FR-73 · D9) — 조용히 무시하지 않는다.
 * 배분도 읽기 전용이다(v1 D9 그대로 · v2 "BTC 50 : 코스피 50" — 성적 · 실패 사례가 기본 배분 기준).
 */
import { PlanBandReadOnlyError } from "../errors";

export const PLAN_READ_ONLY_KEYS = ["bandConfig", "bands", "thresholds", "multipliers", "multiplier", "allocation"] as const;

export const assertNoReadOnlyKeys = (body: unknown): void => {
  if (typeof body !== "object" || body === null) return;
  const hit = PLAN_READ_ONLY_KEYS.find((k) => Object.prototype.hasOwnProperty.call(body, k));
  if (hit) throw new PlanBandReadOnlyError(hit);
};

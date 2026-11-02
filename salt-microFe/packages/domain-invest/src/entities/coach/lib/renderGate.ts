import type { ReportRecommendation } from "@repo/core/coach";

type RenderableRecommendation = Extract<ReportRecommendation, { renderable: true }>;

/**
 * 추천 게이트의 방어적 재확인 (`FE-REQ-027` FR-1~3).
 *
 * 판정은 서버가 했고 BFF 가 한 번 더 막았다. 여기는 **세 번째 줄**이다 — `renderable: true`
 * 인데 3종 세트나 `scoreNote` 가 비었으면 그리지 않는다. 그것은 정상 동작이 아니라 계약
 * 위반이므로 개발 로그에 남기고, 화면은 "불러올 수 없음"으로 간다(막힘 문구가 아니다).
 *
 * **여는 길이 없다.** `false` 를 `true` 로 바꾸는 분기 · 인자가 없다(FR-4).
 */
export const passesRecommendationGate = (
  recommendation: ReportRecommendation,
): recommendation is RenderableRecommendation => {
  if (!recommendation.renderable) return false;

  const intact =
    recommendation.reasons.length > 0 &&
    recommendation.signalTrackRecord.sample > 0 &&
    recommendation.failureCases.length > 0 &&
    recommendation.scoreNote.length > 0;

  if (!intact && process.env.NODE_ENV !== "production") {
    console.warn("[coach] renderable 추천의 3종 세트가 비었다 — 계약 위반", recommendation);
  }
  return intact;
};

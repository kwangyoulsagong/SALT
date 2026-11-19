import type { ServiceIconVariant } from "@repo/ui/serviceicon";

import type { HomeDomain } from "./types";

/**
 * 홈 카드 도메인 아이콘 — 사용자가 만든 3D 서비스 아이콘 한 벌에서(2026-11-19 사용자 결정, `FE-REQ-048` FR-8).
 * 11-02 홈이 도메인 카드로 바뀌며 빠졌던 것을 되돌린다. 저축 = 보석 · 가계부 = 영수증 + ₩(새로 그림) · 투자 = 분석 막대 · 팁 = i
 */
export const HOME_DOMAIN_ICON: Readonly<Record<HomeDomain, ServiceIconVariant>> = {
  savings: "ranking",
  household: "household",
  invest: "analysis",
  tips: "tip",
};

/**
 * 이 zone 의 라우트 경로.
 *
 * **zone 을 넘는 경로는 여기 없다.** 그것은 `@repo/core/zones` 가 소유하고
 * `shared/ui` 의 `CrossZoneLink` 만 사용한다 (`microfrontend.md`).
 */
export const ROUTES = {
  login: "/",
  home: "/home",
  investments: "/investments",
  /** 상세 분석. 투자 우측 패널 · 시장 요약 띠가 같이 쓴다 */
  investmentDetail: (symbol: string) => `/investments/${encodeURIComponent(symbol)}`,
  /** 코치 리포트. 코치 탭(F006)이 생기기 전까지 홈 · 투자 화면에서 들어온다 */
  coachReport: "/coach/report",
  onboarding: "/onboarding",
  addGoal: "/goals/addgoals",
} as const;

export {
  CROSS_ZONE_PATH_PREFIXES,
  ZONES,
  isCrossZonePath,
} from "@repo/core/zones";

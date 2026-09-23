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
  /** 코치 리포트. 투자 화면 머리에서 들어온다 */
  coachReport: "/coach/report",
  onboarding: "/onboarding",
  addGoal: "/goals/addgoals",
} as const;

export {
  CROSS_ZONE_PATH_PREFIXES,
  ZONES,
  isCrossZonePath,
} from "@repo/core/zones";

/**
 * 판단 모드 URL 키 — `?mode=` (`FE-REQ-026` FR-111). 패널 · 상세 · 표 링크가 같이 쓴다.
 *
 * `features/switch-coach-mode` 에 있던 것을 여기로 내렸다(2026-09-23): 서버 컴포넌트가 이 상수 하나
 * 때문에 feature 배럴을 가져오면, 배럴의 `"use client"` 모듈(모드 스위치)까지 그 페이지의 클라이언트
 * 경계가 된다.
 */
export const COACH_MODE_PARAM = "mode";

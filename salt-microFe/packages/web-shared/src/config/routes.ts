/**
 * 이 zone 의 라우트 경로.
 *
 * **zone 을 넘는 경로는 여기 없다.** 그것은 `@repo/core/zones` 가 소유하고
 * `shared/ui` 의 `CrossZoneLink` 만 사용한다 (`microfrontend.md`).
 */
/**
 * 코치 리포트 섹션 앵커 — 요약 띠(`judgment-overview`)와 리포트(`coach-console`)가 같은 id 를 쓴다.
 * 두 위젯이 서로를 부를 수 없어(같은 레이어) 여기 한 벌만 둔다
 */
export const COACH_REPORT_SECTIONS = {
  targetWeight: "target-weight",
  riskBudget: "risk-budget",
  scoreboard: "scoreboard",
} as const;
export type CoachReportSection = (typeof COACH_REPORT_SECTIONS)[keyof typeof COACH_REPORT_SECTIONS];

export const ROUTES = {
  login: "/",
  home: "/home",
  investments: "/investments",
  /** 종목 검색 — 투자 화면 머리 · 관심 종목 빈 상태에서 들어온다(`FE-REQ-010` FR-70) */
  search: "/search",
  /** 설정 — 헤더 프로필 메뉴에서 들어온다(F004 FR-12) */
  settings: "/settings",
  /** 상세 분석. 투자 우측 패널 · 시장 요약 띠가 같이 쓴다 */
  investmentDetail: (symbol: string) => `/investments/${encodeURIComponent(symbol)}`,
  /** 코치 리포트. 투자 화면 머리에서 들어온다 */
  coachReport: "/coach/report",
  /** 코치 리포트의 한 섹션 — 투자 화면 요약 띠가 여기로 간다 */
  coachReportSection: (id: CoachReportSection) => `/coach/report#${id}`,
  /** 판정 근거 상세 — 성적표 그룹 하나(`[kr_stock.]<mode>.<action>`). 성적표 그룹이 여기로 온다(F004 FR-33) */
  signalEvidence: (signalType: string) => `/coach/signals/${encodeURIComponent(signalType)}`,
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

/**
 * 상세 분석의 주문 전 체크 카드 자리(F004 FR-155). 머리는 서버 컴포넌트라 기능 배럴을 값으로 부르지 않는다
 * (`performance-frontend.md` §7) — 해시 링크와 카드가 이 id 하나를 같이 본다.
 */
export const PREFLIGHT_ANCHOR_ID = "preflight-check";

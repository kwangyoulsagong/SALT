/**
 * 코치 upstream 경로. origin 은 `shared/config` 에 있고 경로는 이 슬라이스가 갖는다.
 *
 * **`mode` 를 싣지 않는다** (`FE-REQ-028` FR-85). 응답에 두 모드가 다 있고, 첫 모드는
 * 서버가 정한다(B16). 모드를 보내면 쿼리 키에도 넣어야 해서 모드 전환이 요청이 된다.
 */
export const COACH_ENDPOINTS = {
  symbolDetail: (symbol: string) =>
    `/api/app/ai-coach/detail?symbol=${encodeURIComponent(symbol)}`,
  /** 사기 전 · 팔기 전 점검 — AI 패널 맨 위 쉬운 한 줄(F017 v2 단계 2 · `BFF-REQ-052` FR-3) */
  tradeCheck: (symbol: string, side: "buy" | "sell") =>
    `/api/app/ai-coach/check?symbol=${encodeURIComponent(symbol)}&side=${side}`,
  /** 코치 리포트 (`BFF-REQ-023`). 종목 판단과 다른 화면 · 다른 경로다 */
  report: "/api/app/coach/report",
  /** 재생성 버튼 상태 · 202 뒤 폴링 (`BFF-REQ-023` FR-61~63) */
  generationStatus: "/api/app/coach/generation-status",
  /** 한 장 패널 — 시나리오 · 점검 · 원인 · 회사 사정 · 성적 · 해설 · 내 기준 한 콜(F017 v4 1d · `BFF-REQ-052` FR-6) */
  panel: (symbol: string) => `/api/app/ai-coach/panel?symbol=${encodeURIComponent(symbol)}`,
  /** 주요 사건(거시 일정) · 과거 반응 — 소유자 전용, 아니면 404 (`BFF-REQ-037` FR-8) */
  events: (symbol: string) => `/api/app/coach/events?symbol=${encodeURIComponent(symbol)}`,
  /** 쏠림 신호(펀딩비 · 김치 프리미엄) · 과거 반응 — 소유자 전용, 아니면 404 (`BFF-REQ-037` FR-9) */
  /** 리스크 예산 게이지 · 측정 · 설정 (F009 `BFF-REQ-038`). 조회 · 저장이 같은 경로다 */
  riskBudget: "/api/app/coach/risk-budget",
  /** 코치 설정 — 매입가 숨김(F009 FR-27). 조회 GET · 저장 PATCH 가 같은 경로다 */
  profile: "/api/app/ai-coach/profile",
  /** 종목별 거래 계획 (F009 `BFF-REQ-038`) */
  plans: (symbol: string) => `/api/app/coach/plans?symbol=${encodeURIComponent(symbol)}`,
  /** 내 거래 미러 (F009 슬라이스 5 `BFF-REQ-038` FR-7) */
  mirror: "/api/app/coach/mirror",
  /** 국내 주식 미러(F011 FR-47) — 로그인 전체(`ADR-011`) */
  krMirror: "/api/app/coach/mirror/kr-stock",
  /** 청산별 결과 · 태그. 확정은 `outcomeTags` 에 PUT(`features/confirm-outcome-tags`) */
  /** `assetType` 이 없으면 코인(BFF · 서버 기본). 국내 미러는 `kr_stock`(F011 FR-47) */
  outcomes: (limit: number, assetType?: "crypto" | "kr_stock") =>
    `/api/app/coach/outcomes?limit=${limit}${assetType ? `&assetType=${assetType}` : ""}`,
  outcomeTags: (id: string) => `/api/app/coach/outcomes/${encodeURIComponent(id)}/tags`,
  /** 판정 성적표 — 신호 유형별, 사용자별 아님 (F010 슬라이스 3 `BFF-REQ-039` FR-5) */
  scoreboard: "/api/app/coach/scoreboard",
  /** 목표 비중 안내 — 확률 없음 (F010 슬라이스 5 `BFF-REQ-041`) */
  /** 월간 복기(F009 슬라이스 6 `BFF-REQ-038` FR-10). 달이 없으면 서버가 KST 지난달을 고른다 */
  monthlyReview: (month: string | null) =>
    month ? `/api/app/coach/review/monthly?month=${encodeURIComponent(month)}` : "/api/app/coach/review/monthly",
  /** 월간 복기 국내판(F011 FR-48 `BFF-REQ-040` FR-26) — 로그인 전체(`ADR-011`) */
  krMonthlyReview: (month: string | null) =>
    month
      ? `/api/app/coach/review/monthly/kr-stock?month=${encodeURIComponent(month)}`
      : "/api/app/coach/review/monthly/kr-stock",
  /** 코치 대화 목록(F006 C절 · `BFF-REQ-028`) — 최근 대화가 앞 */
  coachConversations: (limit: number) => `/api/app/coach/conversations?limit=${limit}`,
  /** 대화의 메시지 — 최신이 앞(역순 커서). `cursor` = 앞 쪽의 `nextCursor`(그보다 오래된 것) */
  coachMessages: (conversationId: string, limit: number, cursor: string | null = null) =>
    `/api/app/coach/conversations/${encodeURIComponent(conversationId)}/messages?limit=${limit}${
      cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
    }`,
  /** 오늘의 브리핑 — 대화 첫 메시지(F006 2단계) */
  coachBriefing: "/api/app/coach/briefing",
  /** PC 패널 배치(F006 A절 · `BFF-REQ-028`) — 읽기 GET · 저장 PUT(`features/arrange-panels`)이 같은 경로 */
  panelLayout: "/api/app/coach/panel-layout",
} as const;

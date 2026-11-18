/**
 * 알림 화면 계약(F006 알림 · `BFF-REQ-027` FR-90~92 · `BFF-REQ-028` FR-45) — BFF `bff/src/services/alerts.viewmodel.ts` 와 같은 정의다.
 * `bff` 는 pnpm workspace 밖이라 두 벌이고, 아래 `CONTRACT` 블록을 BFF `__tests__/alerts-contract.test.ts` 가 글자 그대로 대조한다.
 */

// CONTRACT:BEGIN AlertsView
export const ALERT_KINDS = ["signal_update", "goal_reached", "fixed_cost_increased"] as const;

export type AlertKind = (typeof ALERT_KINDS)[number];

/**
 * 누르면 갈 곳 — **코드**다, 경로 문자열 0(`BFF-REQ-028` FR-45 · `BFF-REQ-027` FR-92). 경로는 웹 `shared/config` · 앱 딥링크가 푼다.
 * 종류가 셋으로 늘어(서버 S2c) 옛 `coach` · `home.weekly-plan` 둘을 갈음했다(2026-11-18 F006 알림 화면):
 * - `invest.symbol` — 판단이 바뀐 종목 상세(`symbol` 이 있을 때)
 * - `invest.coach` — 종목이 없는 판단 변화(옛 행) → 코치 리포트
 * - `savings.goals` — 목표 달성(이벤트에 목표 id 가 없다 — 목록으로)
 * - `household.board` — 고정비 오름(가계부 화면의 고정비 칸)
 */
export const ALERT_TARGETS = ["invest.symbol", "invest.coach", "savings.goals", "household.board"] as const;

export type AlertTarget = (typeof ALERT_TARGETS)[number];

export interface AlertVM {
  id: string;
  kind: AlertKind;
  symbol: string | null;
  /** 문장 키. 문장은 프론트 `shared/i18n` 이 만든다 — BFF 가 만들지 않는다 (FR-23) */
  messageCode: string;
  /** 문장 인자. 코드 문자열만 남는다 */
  params: Record<string, string>;
  /** 누르면 갈 곳 코드 — 경로 아님 */
  target: AlertTarget;
  isRead: boolean;
  createdAt: string;
}

export interface AlertsVM {
  alerts: AlertVM[];
  unreadCount: number;
  /** 다음 쪽 번호 — 없으면 null(서버 `total` 로 판정. 거른 행이 있어도 쪽 번호는 서버 기준) */
  nextPage: number | null;
}

/** 벨 배지 — `GET /api/app/alerts/unread-count` */
export interface AlertUnreadVM {
  unreadCount: number;
}
// CONTRACT:END AlertsView

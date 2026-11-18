/**
 * 알림 뷰모델 매핑 — **순수 함수** (`BFF-REQ-007` C절).
 *
 * 서버(Kotlin notification, `SRV-REQ-048` FR-5 — 서버 S2c)가 켠 도메인의 종류만 주고 문장 · 금액을 싣지 않는다.
 * 종류는 도메인마다 하나 — `signal_update`(투자) · `goal_reached`(저축) · `fixed_cost_increased`(가계부)(`BFF-REQ-046` FR-8).
 * 그래도 여기서 한 번 더 거른다 — 서버가 옛 행이나 금액을 실어 보내도 **잠금 화면까지
 * 가지 않게** 하는 마지막 자리다(FR-21 · 22). 오류로 만들지 않고 버린다.
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

const isAlertKind = (kind: unknown): kind is AlertKind => (ALERT_KINDS as readonly unknown[]).includes(kind);

/** 화면 기본 개수 (FR-24). */
export const ALERT_LIMIT = 20;

/** 종류(+ 종목) → 갈 곳. 종류마다 한 군데 — 서버 종류가 늘면 여기와 `ALERT_KINDS` 가 같이 는다 */
export const toAlertTarget = (kind: AlertKind, symbol: string | null): AlertTarget => {
  if (kind === "goal_reached") return "savings.goals";
  if (kind === "fixed_cost_increased") return "household.board";
  return symbol ? "invest.symbol" : "invest.coach";
};

export interface ServerNotificationItem {
  id: string;
  kind?: string;
  symbol?: string | null;
  messageCode?: string | null;
  params?: Record<string, unknown> | null;
  isRead?: boolean;
  createdAt: string;
}

/** 이름이 금액을 뜻하는 키 · 숫자처럼 생긴 값. 서버 `messageGuard` 와 같은 기준이다 */
const AMOUNT_KEY =
  /price|amount|value|krw|usd|won|balance|pnl|profit|loss|cost|qty|quantity|total/i;
const NUMERIC = /^[-+]?[\d,]*\.?\d+%?$/;

/** 종목 코드 — 국내 주식은 숫자 여섯 자리라 숫자 검사가 아니라 코드 형식으로 본다(서버 `MessageGuard` 와 같은 규칙, 2026-11-06) */
const SYMBOL = /^[A-Za-z0-9.-]{1,20}$/;

const isSafeParam = (key: string, value: string): boolean =>
  key === "symbol" ? SYMBOL.test(value) : !AMOUNT_KEY.test(key) && !NUMERIC.test(value.trim());

const toParams = (params: ServerNotificationItem["params"]): Record<string, string> =>
  Object.fromEntries(
    Object.entries(params ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && isSafeParam(entry[0], entry[1]),
    ),
  );

export const toAlertViewModels = (
  items: readonly ServerNotificationItem[],
): AlertVM[] =>
  items
    .filter(
      (item) =>
        isAlertKind(item.kind) &&
        typeof item.messageCode === "string" &&
        item.messageCode !== "",
    )
    .map((item): AlertVM => ({
      id: item.id,
      kind: item.kind as AlertKind,
      symbol: item.symbol ?? null,
      messageCode: item.messageCode as string,
      params: toParams(item.params),
      target: toAlertTarget(item.kind as AlertKind, item.symbol ?? null),
      isRead: item.isRead === true,
      createdAt: item.createdAt,
    }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, ALERT_LIMIT);

/** 서버 쪽 모양(`{ page, size, total }`) → 다음 쪽. 숫자가 아니면 다음 쪽 없음 — 끝없이 부르지 않는다 */
export const toNextPage = (page: unknown, size: unknown, total: unknown): number | null =>
  typeof page === "number" && typeof size === "number" && typeof total === "number" && size > 0 && page * size < total ? page + 1 : null;

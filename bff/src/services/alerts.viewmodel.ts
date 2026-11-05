/**
 * 알림 뷰모델 매핑 — **순수 함수** (`BFF-REQ-007` C절).
 *
 * 서버(Kotlin notification, `SRV-REQ-048` FR-5 — 서버 S2c)가 켠 도메인의 종류만 주고 문장 · 금액을 싣지 않는다.
 * 종류는 도메인마다 하나 — `signal_update`(투자) · `goal_reached`(저축) · `fixed_cost_increased`(가계부)(`BFF-REQ-046` FR-8).
 * 그래도 여기서 한 번 더 거른다 — 서버가 옛 행이나 금액을 실어 보내도 **잠금 화면까지
 * 가지 않게** 하는 마지막 자리다(FR-21 · 22). 오류로 만들지 않고 버린다.
 */

export const ALERT_KINDS = ["signal_update", "goal_reached", "fixed_cost_increased"] as const;

export type AlertKind = (typeof ALERT_KINDS)[number];

const isAlertKind = (kind: unknown): kind is AlertKind => (ALERT_KINDS as readonly unknown[]).includes(kind);

/** 화면 기본 개수 (FR-24). */
export const ALERT_LIMIT = 20;

export interface AlertVM {
  id: string;
  kind: AlertKind;
  symbol: string | null;
  /** 문장 키. 문장은 프론트 `shared/i18n` 이 만든다 — BFF 가 만들지 않는다 (FR-23) */
  messageCode: string;
  /** 문장 인자. 코드 문자열만 남는다 */
  params: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

export interface AlertsVM {
  alerts: AlertVM[];
  unreadCount: number;
}

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

const toParams = (params: ServerNotificationItem["params"]): Record<string, string> =>
  Object.fromEntries(
    Object.entries(params ?? {}).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" &&
        !AMOUNT_KEY.test(entry[0]) &&
        !NUMERIC.test(entry[1].trim()),
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
      isRead: item.isRead === true,
      createdAt: item.createdAt,
    }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, ALERT_LIMIT);

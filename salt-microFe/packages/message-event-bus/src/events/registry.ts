export const EVENT_NAMES = {
  accountSelected: "account.selected",
} as const;

export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];

export interface EventPayloadMap {
  [EVENT_NAMES.accountSelected]: {
    accountId?: string;
    account?: unknown;
  };
}

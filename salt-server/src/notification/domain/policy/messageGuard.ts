import { NotificationAmountError, NotificationMessageCodeError } from "../errors";
import type { NotificationParams } from "../Notification";

/**
 * 알림에 **문장과 금액이 들어가지 못하게** 한다 (`SRV-REQ-008` FR-24 · 25).
 *
 * 인자 값은 문자열만 받는다 — 숫자를 열어 두면 "가격은 숫자가 아니니 괜찮다"는 판단이 매번
 * 필요해진다. 문자열이어도 숫자처럼 생겼으면 거부하고, 이름이 금액을 뜻하는 키도 거부한다.
 * 종목 · 모드 · 행동 같은 **코드**만 지나간다.
 */
const MESSAGE_CODE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const AMOUNT_KEY =
  /price|amount|value|krw|usd|won|balance|pnl|profit|loss|cost|qty|quantity|total/i;
const NUMERIC = /^[-+]?[\d,]*\.?\d+%?$/;

export const assertMessageCode = (code: string): void => {
  if (!MESSAGE_CODE.test(code)) throw new NotificationMessageCodeError(code);
};

export const assertNoAmounts = (params: NotificationParams): void => {
  for (const [key, value] of Object.entries(params)) {
    if (AMOUNT_KEY.test(key) || NUMERIC.test(value.trim())) {
      throw new NotificationAmountError(key);
    }
  }
};

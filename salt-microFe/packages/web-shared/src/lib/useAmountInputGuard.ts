"use client";

import { useState } from "react";

import { readAmountInput } from "./amountInput";

/**
 * 금액 칸 여럿을 가진 폼이 같이 쓴다 — 받을 수 없는 글자가 들면 값을 바꾸지 않고 `rejected` 를 켠다(조용히 버리지 않는다, 저축 리뷰 8차).
 * `take(v, set)` 을 각 칸의 onChange 에서 부른다. 안내 문구는 `@repo/web-shared/i18n` `AMOUNT_INPUT_MESSAGES`
 */
export const useAmountInputGuard = () => {
  const [rejected, setRejected] = useState(false);
  const take = (raw: string, set: (value: string) => void, options: { decimal?: boolean } = {}) => {
    const next = readAmountInput(raw, options);
    setRejected(next === null);
    if (next !== null) set(next);
  };
  return { rejected, take };
};

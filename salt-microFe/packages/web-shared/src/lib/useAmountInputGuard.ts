"use client";

import { useState } from "react";

import type { NumberTextKind } from "@repo/core/input";

import { AMOUNT_INPUT_MESSAGES } from "../i18n";
import { readAmountInput } from "./amountInput";

/**
 * 숫자 칸 여럿을 가진 폼이 같이 쓴다 — 받을 수 없는 글자가 들면 값을 바꾸지 않고 **그 칸 종류에 맞는 안내**를 켠다(조용히 버리지 않는다).
 * 안내는 받을 수 있는 입력이 오거나 `clear()`(제출 · 성공) 때 꺼진다 — 서버 오류 · 성공 문구를 가리지 않게(저축 리뷰 9차)
 */
export const useAmountInputGuard = () => {
  const [message, setMessage] = useState<string | null>(null);
  const take = (raw: string, set: (value: string) => void, kind: NumberTextKind = "won") => {
    const next = readAmountInput(raw, kind);
    setMessage(next === null ? AMOUNT_INPUT_MESSAGES[kind] : null);
    if (next !== null) set(next);
  };
  return { message, take, clear: () => setMessage(null) };
};

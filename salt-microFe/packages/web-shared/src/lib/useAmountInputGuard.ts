"use client";

import { useState } from "react";

import { readNumberText, type NumberTextKind } from "@repo/core/input";

import { AMOUNT_INPUT_MESSAGES } from "../i18n";

/**
 * 숫자 칸 여럿을 가진 폼이 같이 쓴다 — 받을 수 없는 글자가 들면 값을 바꾸지 않고 **그 칸**에 안내를 켠다(조용히 버리지 않는다).
 * 안내는 칸마다 따로(`field`) — 다른 칸에 정상 입력해도 거절된 칸의 안내가 꺼지지 않는다(리뷰 10차). `clear()` 는 제출 · 성공 때
 */
export const useAmountInputGuard = () => {
  const [messages, setMessages] = useState<Record<string, string>>({});
  const take = (raw: string, set: (value: string) => void, kind: NumberTextKind = "won", field = "default") => {
    const next = readNumberText(raw, kind);
    setMessages((prev) => {
      const rest = { ...prev };
      delete rest[field];
      return next === null ? { ...rest, [field]: AMOUNT_INPUT_MESSAGES[kind] } : rest;
    });
    if (next !== null) set(next);
  };
  const message = Object.values(messages)[0] ?? null;
  /** 칸 하나의 안내 — 칸 아래 오류 자리(`TextField error`)에 둘 때 */
  const messageFor = (field: string): string | undefined => messages[field];
  return { message, messageFor, take, clear: () => setMessages({}) };
};

"use client";

import { useCallback, useRef, useState } from "react";

import { numberToInputText, readNumberText, type NumberTextKind } from "@repo/core/input";

import { AMOUNT_INPUT_MESSAGES } from "../i18n";

/**
 * 숫자 칸들의 **값과 안내를 한 덩어리로** 쥔다 — 칸 값을 바꾸는 길(입력 · 버튼 · 칩 · 현재가 · 초기화)이 전부 같은 규칙(`@repo/core/input`)을 지나고,
 * 그때 그 칸의 안내도 같이 바뀐다. 안내만 따로 들고 있으면 버튼 · 칩 · 칸 숨김마다 손으로 지워야 했고 매번 한 곳씩 빠졌다(저축 리뷰 10 · 11차).
 *
 * - `change(key, raw)` 사용자 입력 — 받을 수 없으면 값을 두고 그 칸에 안내
 * - `set(key, text)` · `setNumber(key, n)` 코드가 넣는 값 — 같은 규칙으로 정리하고 안내를 지운다
 * - `fillIfEmpty(key, n)` 비어 있을 때만 코드가 채운다(진입가 기본 = 현재가)
 * - `reset(keys?)` 비우기(제출 성공 · 단위 전환) · `dismiss(key)` 그 칸 안내만 지우기(칸이 숨을 때)
 * - 안내는 `message(key)` — 그 칸 아래(`TextField error`)에 둔다. 칸이 숨으면 안내도 같이 숨는다
 *
 * 바꾸는 함수들은 렌더마다 같은 참조다(effect 의존성에 넣어도 다시 돌지 않는다). 칸 규칙(`kinds`)은 렌더마다 최신 값을 읽는다(단위 전환)
 *
 * @param fallbackKind 없는 키(목표마다 칸 — 나눠 넣기 · 저울)의 규칙
 */
export const useNumberFields = (
  kinds: Readonly<Record<string, NumberTextKind>>,
  initial: Readonly<Record<string, string>> = {},
  fallbackKind: NumberTextKind = "won",
) => {
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...initial }));
  const [messages, setMessages] = useState<Record<string, string>>({});
  const kindsRef = useRef({ kinds, fallbackKind });
  kindsRef.current = { kinds, fallbackKind };
  const kindOf = useCallback((key: string): NumberTextKind => kindsRef.current.kinds[key] ?? kindsRef.current.fallbackKind, []);

  const dropMessages = useCallback((keys: readonly string[] | null) => {
    setMessages((prev) => {
      if (keys === null) return {};
      if (!keys.some((k) => k in prev)) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  const write = useCallback(
    (key: string, value: string) => {
      setValues((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
      dropMessages([key]);
    },
    [dropMessages],
  );

  const change = useCallback(
    (key: string, raw: string) => {
      const next = readNumberText(raw, kindOf(key));
      if (next === null) setMessages((prev) => ({ ...prev, [key]: AMOUNT_INPUT_MESSAGES[kindOf(key)] }));
      else write(key, next);
    },
    [kindOf, write],
  );
  const set = useCallback((key: string, text: string) => write(key, readNumberText(text, kindOf(key)) ?? ""), [kindOf, write]);
  const setNumber = useCallback(
    (key: string, n: number | null) => write(key, n === null ? "" : numberToInputText(n, kindOf(key))),
    [kindOf, write],
  );
  const fillIfEmpty = useCallback(
    (key: string, n: number) => {
      const text = numberToInputText(n, kindOf(key));
      setValues((prev) => (prev[key] ? prev : { ...prev, [key]: text }));
    },
    [kindOf],
  );
  const reset = useCallback(
    (keys?: readonly string[]) => {
      setValues((prev) => {
        if (!keys) return {};
        const next = { ...prev };
        keys.forEach((k) => delete next[k]);
        return next;
      });
      dropMessages(keys ?? null);
    },
    [dropMessages],
  );
  const dismiss = useCallback((key: string) => dropMessages([key]), [dropMessages]);

  return {
    value: (key: string): string => values[key] ?? "",
    message: (key: string): string | undefined => messages[key],
    change,
    set,
    setNumber,
    fillIfEmpty,
    reset,
    dismiss,
  };
};

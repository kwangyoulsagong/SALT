"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import type { ExplainResult, ExplainSymbolRequest } from "../model";
import { explainSymbolApi } from "./explainSymbolApi";

/**
 * [해설 보기] (`FE-REQ-028` FR-10~13 · `FE-REQ-029` FR-1 · FR-5).
 *
 * - **누를 때만** 부른다. 쿼리가 아니라 mutation 이다 — 마운트 · 종목 전환으로 불릴 길이 없다
 * - **재시도 0회.** 서버가 폴백을 갖고 있고 LLM 재시도는 비용이다
 * - **진행 중에는 다시 보내지 않는다**(`BFF-REQ-026` FR-6 — 디바운스는 프론트가 근본이다).
 *   버튼이 `loading` 으로 막히지만 같은 프레임의 연타는 `disabled` 반영 전에 들어온다. 그래서
 *   가드가 상태(`isPending`)가 아니라 **ref** 다 — 상태 가드는 다음 렌더 전까지 옛 값이라
 *   3연타가 3건으로 나갔다(2026-09-22 실측)
 * - 언마운트하면 끊는다. 모드가 바뀌면 부르는 쪽이 `key` 로 이 훅을 새로 만든다 — 그것도
 *   언마운트다. 끊으면 BFF 가 서버 LLM 호출까지 끊는다(`ai-coach.controller` `res.on("close")`)
 */
export const useExplainSymbol = () => {
  const controllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  const mutation = useMutation<ExplainResult, Error, ExplainSymbolRequest>({
    mutationFn: (body) => {
      const controller = new AbortController();
      controllerRef.current = controller;
      return explainSymbolApi.explain(body, controller.signal);
    },
    retry: 0,
    onSettled: () => {
      inFlightRef.current = false;
    },
  });

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const { mutate } = mutation;
  const request = useCallback(
    (body: ExplainSymbolRequest) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      mutate(body);
    },
    [mutate],
  );

  return { ...mutation, request };
};

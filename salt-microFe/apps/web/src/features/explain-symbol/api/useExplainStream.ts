"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import { StreamHttpError } from "@/shared/api";
import { HTTP_STATUS_CODE } from "@/shared/config";

import {
  explainStreamReducer,
  initialExplainStreamState,
  type ExplainSymbolRequest,
} from "../model";
import { EXPLAIN_STREAM_TIMEOUT_MS, explainStreamApi } from "./explainStreamApi";

/**
 * [해설 보기] 스트림 (F008 `FE-REQ-038` FR-7 · FEATURE-008 FR-60~63).
 *
 * - 누를 때만 연다. 진행 중에는 다시 열지 않는다 — 가드는 상태가 아니라 **ref**(연타가 같은 프레임에 온다)
 * - 언마운트 · 모드 전환(`key`)이면 끊는다 — BFF · 서버 · LLM 까지 끊긴다
 * - 재시도 0회 — 받은 템플릿 문장이 있으면 그것이 최종이고, 없으면 화면이 판단 근거 문장으로 대신한다
 */
export const useExplainStream = () => {
  const [state, dispatch] = useReducer(explainStreamReducer, initialExplainStreamState);
  const controllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const request = useCallback((body: ExplainSymbolRequest) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = setTimeout(() => controller.abort(), EXPLAIN_STREAM_TIMEOUT_MS);
    dispatch({ type: "start" });

    explainStreamApi
      .open(body, controller.signal, (event) => dispatch({ type: "event", event }))
      .then(() => dispatch({ type: "ended" }))
      .catch((error: unknown) => {
        // 끊김 · 타임아웃 · 읽기 실패 — 받은 글자가 있으면 그것이 최종이다(리듀서가 가른다)
        const busy = error instanceof StreamHttpError && error.status === HTTP_STATUS_CODE.TOO_MANY_REQUESTS;
        dispatch({ type: "failed", busy });
      })
      .finally(() => {
        clearTimeout(timer);
        inFlightRef.current = false;
      });
  }, []);

  return { state, request };
};

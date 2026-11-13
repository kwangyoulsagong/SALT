"use client";

import type { ExplanationSentence, SymbolExplanation } from "@repo/core/coach";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import { coachQueryKeys } from "@/entities/coach";

/** 첫 문장을 기다리는 시간 — 넘으면 "쓰는 중" 반짝임(`FE-REQ-064` FR-10) */
export const FIRST_SENTENCE_WAIT_MS = 1000;

export type ExplanationStreamState =
  | { phase: "idle" }
  /** `slow` — 1초가 지나도 첫 문장이 없다 */
  | { phase: "streaming"; sentences: ExplanationSentence[]; slow: boolean }
  /** 저장본(snapshot) · 생성 끝(done) — 최종 한 벌 */
  | { phase: "done"; view: SymbolExplanation }
  /** 만들 수 없었다 — 서버 문장(이전 AI · 사실표 · 판단만) */
  | { phase: "fallback"; view: SymbolExplanation }
  /** 스트림 자체가 끊겼다 — 화면은 패널이 받은 저장값을 그대로 쓴다 */
  | { phase: "error" };

const streamUrl = (symbol: string, mode: "scalp" | "long_term") =>
  `${INVESTMENTS_BASE_URL}/api/app/ai-coach/explain/stream?symbol=${encodeURIComponent(symbol)}&mode=${mode}`;

/**
 * 해설 스트림 구독(F017 v4 1f · `BFF-REQ-052` FR-7 · `FE-REQ-064` FR-10). `enabled` 일 때만 연다 — 패널이 최신 AI 저장본을 받았으면 열지 않는다.
 *
 * - 브라우저 `EventSource`(같은 origin · 쿠키 세션) — 렌더 중이 아니라 effect 안에서만 만든다(`ssr.md`)
 * - 끝(done · snapshot · fallback · error)이면 닫는다 — `EventSource` 의 자동 재연결이 같은 생성을 또 부르지 않게(서버는 지문당 생성 하나라
 *   다시 붙어도 LLM 이 두 번 돌지는 않지만, 끝난 뒤 다시 열 이유가 없다)
 * - 끝나면 패널 응답을 버린다 — 다음에 열면 최신 AI 저장본이 바로 온다
 */
export const useExplanationStream = (symbol: string, mode: "scalp" | "long_term", enabled: boolean): ExplanationStreamState => {
  const [state, setState] = useState<ExplanationStreamState>({ phase: "idle" });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !symbol) {
      setState({ phase: "idle" });
      return;
    }
    setState({ phase: "streaming", sentences: [], slow: false });
    const source = new EventSource(streamUrl(symbol, mode), { withCredentials: true });
    let finished = false;
    const finish = (next: ExplanationStreamState) => {
      finished = true;
      clearTimeout(slowTimer);
      source.close();
      setState(next);
    };
    const slowTimer = setTimeout(() => {
      setState((s) => (s.phase === "streaming" && s.sentences.length === 0 ? { ...s, slow: true } : s));
    }, FIRST_SENTENCE_WAIT_MS);
    const parse = <T,>(e: MessageEvent): T | null => {
      try {
        return JSON.parse(String(e.data)) as T;
      } catch {
        return null;
      }
    };
    // 닫은 뒤 늦게 온 이벤트는 버린다 — 개발 모드 effect 두 번 · 종목 · 모드가 빨리 바뀔 때 이전 연결의 문장이 섞이지 않게
    source.addEventListener("sentence", (e) => {
      if (finished) return;
      const sentence = parse<ExplanationSentence>(e as MessageEvent);
      if (!sentence) return;
      setState((s) => (s.phase === "streaming" ? { phase: "streaming", sentences: [...s.sentences, sentence], slow: false } : s));
    });
    const terminal = (phase: "done" | "fallback") => (e: Event) => {
      if (finished) return;
      const view = parse<SymbolExplanation>(e as MessageEvent);
      if (!view) return finish({ phase: "error" });
      finish({ phase, view });
      if (phase === "done") void queryClient.invalidateQueries({ queryKey: coachQueryKeys.panel(symbol) });
    };
    source.addEventListener("snapshot", terminal("done"));
    source.addEventListener("done", terminal("done"));
    source.addEventListener("fallback", terminal("fallback"));
    // 서버 `error` 이벤트 · 연결 끊김 둘 다 — 끝난 뒤의 닫힘(onerror)은 무시
    source.addEventListener("error", () => {
      if (!finished) finish({ phase: "error" });
    });
    return () => {
      finished = true;
      clearTimeout(slowTimer);
      source.close();
    };
  }, [enabled, mode, queryClient, symbol]);

  return state;
};

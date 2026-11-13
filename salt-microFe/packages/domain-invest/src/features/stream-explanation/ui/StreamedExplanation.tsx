"use client";

import type { SymbolExplanation } from "@repo/core/coach";

import { ExplainBox } from "@/entities/coach";

import { useExplanationStream } from "../api/useExplanationStream";

interface StreamedExplanationProps {
  symbol: string;
  mode: "scalp" | "long_term";
  /** 패널이 받은 해설(4단) — 최신 AI 면 그대로 · 아니면 스트림이 올 때까지 이것 */
  stored: SymbolExplanation;
}

/**
 * 패널 안 AI 해설 — 저장본이 최신이면 바로 다 보이고, 아니면 스트림(`FE-REQ-064` FR-10).
 *
 * | 때 | 보이는 것 |
 * |---|---|
 * | 처음 1초 | 패널이 받은 서버 문장(이전 AI · 사실표) |
 * | 1초가 지나도 첫 문장 없음 | 같은 문장 + "쓰는 중" 반짝임 |
 * | 문장이 오면 | 그 문장들(AI 표시) + 반짝임 |
 * | 끝 | 최종 한 벌(얼마나 믿을까 · 틀렸던 때 문장은 성적 줄이 그린다) |
 * | 실패 · 끊김 | 서버 문장 |
 */
export const StreamedExplanation = ({ symbol, mode, stored }: StreamedExplanationProps) => {
  const state = useExplanationStream(symbol, mode, stored.tier !== "latest");

  if (state.phase === "done" || state.phase === "fallback") return <ExplainBox view={state.view} />;
  if (state.phase === "streaming" && state.sentences.length > 0) {
    return <ExplainBox view={{ ...stored, tier: "latest", aiGenerated: true, sentences: state.sentences }} streaming />;
  }
  return <ExplainBox view={stored} streaming={state.phase === "streaming" && state.slow} />;
};

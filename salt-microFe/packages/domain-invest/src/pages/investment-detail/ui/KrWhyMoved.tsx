"use client";

import { useWhyMoved, WhyMovedCard } from "@/entities/market";

import { krSideCard } from "./SymbolHeader.css";

/**
 * 국내 상세 "왜 움직였나"(F016 단계 C · `FE-REQ-063` FR-1) — 머리 바로 아래. 404(없는 종목) · 불러오는 중 · 실패 · 꺼짐엔 자리도 없다
 * (오늘 소식 카드와 같은 규칙). 카드 조건이 아니면 접힌 한 줄
 */
export const KrWhyMoved = ({ code }: { code: string }) => {
  const { data, isError } = useWhyMoved({ kind: "kr", code });
  if (isError) return null;
  return <WhyMovedCard className={krSideCard} result={data} />;
};

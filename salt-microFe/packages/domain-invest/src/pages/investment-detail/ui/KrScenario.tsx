"use client";

import { SignInRequired } from "@repo/web-shared/ui";

import { DirectionScenarioCard, DirectionScenarioSkeleton, useSymbolScenario } from "@/entities/coach";

import { INVESTMENT_DETAIL_PAGE_MESSAGES as M } from "../model";
import { krSideCard } from "./SymbolHeader.css";

/**
 * 국내 주식 시나리오(F017 v4 순서 1 · `FE-REQ-064` FR-8) — 코인 상세와 **같은 카드 · 같은 자리(오른쪽 열 맨 위)**.
 *
 * 모든 종목에 늘 보인다(과거 실제 결과) — "자세히" 뒤로 접지 않는다(사용자 2026-11-13 "안 뜨는 게 문제 · 모든 종목에 항상").
 * 로그인 안 했으면 유리막 · 불러오는 동안은 같은 높이의 자리. 면책은 카드 안
 */
export const KrScenario = ({ code }: { code: string }) => {
  const scenario = useSymbolScenario(code);
  return (
    <SignInRequired what={M.guestWhat.scenario} minHeight={480}>
      {scenario.data || scenario.isError ? (
        <DirectionScenarioCard className={krSideCard} result={scenario.data ?? { status: "unavailable" }} />
      ) : (
        <DirectionScenarioSkeleton className={krSideCard} />
      )}
    </SignInRequired>
  );
};

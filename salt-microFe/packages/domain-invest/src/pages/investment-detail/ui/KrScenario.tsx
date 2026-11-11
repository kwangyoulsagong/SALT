"use client";

import { DirectionScenarioCard, useSymbolScenario } from "@/entities/coach";

import { INVESTMENT_DETAIL_PAGE_MESSAGES as M } from "../model";
import { krMore, krMoreBody, krMoreHint, krMoreSummary, krSideCard } from "./SymbolHeader.css";

/**
 * 국내 주식 시나리오 카드(F017 v2 단계 5 · `FE-REQ-064` FR-4 — 변동 범위 `KrForecast` 자리 교체) — 코인 상세와 **같은 카드 ·
 * 같은 소유자 규칙 · 같은 "자세히" 자리**.
 *
 * - 404 = 소유자 아님 · 로그인 안 함 · 불러오는 중에는 자리도 문구도 없다(ADR-003 "응답에 없다")
 * - 국내 1시간 · 4시간은 장중 기록이 짧아 시험하지 않았다(`short-direction@1`) — 카드가 그 이유를 말한다. 면책은 카드 안
 */
export const KrScenario = ({ code }: { code: string }) => {
  const scenario = useSymbolScenario(code);
  if (scenario.isSignedOut || scenario.notOwner) return null;
  if (!scenario.data && !scenario.isError) return null;

  return (
    <details className={krMore}>
      <summary className={krMoreSummary}>
        {M.krMoreSummary}
        <span className={krMoreHint}>{M.krMoreHint}</span>
      </summary>
      <div className={krMoreBody}>
        <DirectionScenarioCard className={krSideCard} result={scenario.data ?? { status: "unavailable" }} />
      </div>
    </details>
  );
};

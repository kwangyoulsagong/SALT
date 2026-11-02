"use client";

import { Text } from "@repo/ui/text";

import { ForecastCard, useSymbolForecast } from "@/entities/coach";

import { INVESTMENT_DETAIL_PAGE_MESSAGES as M } from "../model";
import { krMore, krMoreBody, krMoreHint, krMoreSummary, krSideCard } from "./SymbolHeader.css";

/**
 * 국내 주식 변동 범위(F011 슬라이스 5d · `FE-REQ-041` FR-23) — 코인 상세와 **같은 카드 · 같은 소유자 규칙 · 같은 "자세히" 자리**.
 *
 * - 404 = 소유자 아님 · 로그인 안 함 · 불러오는 중에는 자리도 문구도 없다(ADR-003 "응답에 없다")
 * - 게이트는 서버(국내 풀링 실력 게이트 `FC-REQ-020` · 신선도)가 정한다. 막힌 기간은 카드가 사유만 그린다
 * - 면책은 서버 문장을 카드 아래에 싣는다. 코인 상세는 화면 하단 띠(코치 응답)에 있는데 국내 상세엔 그 띠가 없다
 */
export const KrForecast = ({ code, livePrice }: { code: string; livePrice: number | null }) => {
  const forecast = useSymbolForecast(code);
  if (forecast.isSignedOut || forecast.notOwner) return null;
  if (!forecast.data && !forecast.isError) return null;

  return (
    <details className={krMore}>
      <summary className={krMoreSummary}>
        {M.krMoreSummary}
        <span className={krMoreHint}>{M.krMoreHint}</span>
      </summary>
      <div className={krMoreBody}>
        <ForecastCard
          className={krSideCard}
          result={forecast.data ?? { status: "unavailable" }}
          livePrice={livePrice}
          assetType="kr_stock"
        />
        {/* 페이지 배경(회색) 위라 tertiary 는 2.75:1 — secondary(2026-10-23 axe) */}
        {forecast.data?.status === "ok" && <Text color="secondary">{forecast.data.disclaimer}</Text>}
      </div>
    </details>
  );
};

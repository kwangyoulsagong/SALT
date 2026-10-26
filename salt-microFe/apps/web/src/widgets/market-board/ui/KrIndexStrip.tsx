"use client";

import { KrIndexSummary, useKrIndices } from "@/entities/market";

import { krIndexPlaceholder } from "./MarketBoardLayout.css";

/**
 * 국내 주식 탭 요약 띠(F011 슬라이스 6 · `FE-REQ-041`) — 코인 요약 띠와 같은 자리, 데이터만 국내 지수.
 *
 * 띠는 부가 정보라 조회 실패 · `unavailable` · 빈 목록이면 **아무것도 그리지 않는다**(코인 띠 FR-8 과 같은 규칙) — 표가 본문이다.
 * 불러오는 동안은 칸 높이만큼 자리를 잡아 표가 밀리지 않게 한다
 */
export const KrIndexStrip = () => {
  const { data, isPending } = useKrIndices();
  if (isPending) return <div className={krIndexPlaceholder} aria-hidden="true" />;
  if (data?.status !== "ok" || data.items.length === 0) return null;
  return <KrIndexSummary items={data.items} />;
};

export default KrIndexStrip;

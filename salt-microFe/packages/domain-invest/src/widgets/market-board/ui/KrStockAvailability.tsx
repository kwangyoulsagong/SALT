"use client";

import { useEffect } from "react";

import { useKrMarketStatus } from "@/entities/market";

/**
 * 국내 주식 탭을 보일지 정한다(F011 UX Empty · Unauthorized). **그리는 것이 없다** — 장 상태를 받아 `onChange` 로만 알린다.
 *
 * 탭 줄(`MarketBoard`)이 직접 조회하지 않는 이유: `MarketBoard` 는 페이지가 정적으로 부르는 껍데기라 엔티티 barrel 을 값으로
 * 가져오면 미리보기 · 차트가 첫 로드에 딸려 온다(`model/index.ts` 주석, 125 → 178 kB). 이 잎은 `ssr:false` 로 늦게 온다.
 *
 * 보이는 경우는 `status: ok` 하나다. 비로그인(조회 안 함) · 소유자 아님(404) · 키 없음(`disabled`)은 숨긴다.
 * `unavailable`(서버 5xx)은 **보인다** — 꺼진 게 아니라 잠시 못 받는 것이라 탭 안에서 다시 시도한다.
 */
export const KrStockAvailability = ({ onChange }: { onChange: (available: boolean) => void }) => {
  const { data } = useKrMarketStatus();
  const available = data?.status === "ok" || data?.status === "unavailable";
  useEffect(() => {
    onChange(available);
  }, [available, onChange]);
  return null;
};

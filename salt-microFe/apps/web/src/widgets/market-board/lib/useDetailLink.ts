"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { COACH_MODE_PARAM } from "@/features/switch-coach-mode";
import { ROUTES } from "@/shared/config";

/**
 * 표 행 → 상세 분석 (`FE-REQ-026` FR-119 개정 2026-09-23).
 *
 * **hover = 우측 미리보기, 클릭 · Enter = 상세.** 종목 이름 칸은 진짜 링크(`hrefOf`)다 — 가운데
 * 클릭 · 새 탭 열기가 되고 검색 로봇이 따라갈 수 있다. 행의 나머지 자리를 누르면 `open` 이 같은
 * 주소로 간다.
 *
 * 지금 보고 있는 판단 모드(`?mode=`)를 들고 간다 — 패널과 상세가 같은 URL 상태를 쓴다(FR-111).
 */
export const useDetailLink = () => {
  const router = useRouter();
  const mode = useSearchParams()?.get(COACH_MODE_PARAM);

  const hrefOf = useCallback(
    (symbol: string) => {
      const path = ROUTES.investmentDetail(symbol);
      return mode ? `${path}?${COACH_MODE_PARAM}=${encodeURIComponent(mode)}` : path;
    },
    [mode],
  );
  const open = useCallback((symbol: string) => router.push(hrefOf(symbol)), [router, hrefOf]);

  return { hrefOf, open };
};

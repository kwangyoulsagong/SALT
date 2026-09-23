"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { COACH_MODE_PARAM } from "@/features/switch-coach-mode";
import { ROUTES } from "@/shared/config";

/**
 * 표 행 클릭 → 상세 분석 (`FE-REQ-026` FR-119 개정 2026-09-23).
 *
 * 전에는 우측 패널 맨 아래 [상세 분석 보기] 버튼이 유일한 길이었다 — 행을 누르면 선택만 되고
 * 한 번 더 내려가 버튼을 눌러야 했다. 이제 **hover = 우측 미리보기, 클릭 · Enter = 상세**다.
 *
 * 지금 보고 있는 판단 모드(`?mode=`)를 들고 간다 — 패널과 상세가 같은 URL 상태를 쓴다(FR-111).
 */
export const useOpenDetail = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams?.get(COACH_MODE_PARAM);

  return useCallback(
    (symbol: string) => {
      const path = ROUTES.investmentDetail(symbol);
      router.push(mode ? `${path}?${COACH_MODE_PARAM}=${encodeURIComponent(mode)}` : path);
    },
    [router, mode],
  );
};

import type { CoachMode, SymbolCoachViewModel } from "@repo/core/coach";

import { selectModeView } from "@/entities/coach";

import type { ExplainSymbolRequest } from "./types";

/**
 * 해설 요청 본문 — 종목과 관점뿐이다. 사실은 서버가 모은다(`SRV-REQ-025` FR-58).
 *
 * 판단 꼬리표는 해설을 막지 않는다(`ADR-010` v2 — `FE-REQ-026` FR-135 대체). 모드가 계약 깨짐(`null`)일 때만 `null`.
 */
export const buildExplainRequest = (
  view: SymbolCoachViewModel,
  mode: CoachMode,
): ExplainSymbolRequest | null =>
  selectModeView(view, mode) ? { symbol: view.symbol, mode } : null;

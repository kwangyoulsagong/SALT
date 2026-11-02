import type { CoachMode, SymbolCoachViewModel } from "@repo/core/coach";

import { selectModeView } from "@/entities/coach";

import type { ExplainSymbolRequest } from "./types";

/**
 * 해설 요청 본문 — 종목과 관점뿐이다. 사실은 서버가 모은다(`SRV-REQ-025` FR-58).
 *
 * 판단이 막힌 모드는 부르는 쪽이 버튼을 그리지 않는다(FR-135). 그래도 여기 오면 `null` 이다.
 */
export const buildExplainRequest = (
  view: SymbolCoachViewModel,
  mode: CoachMode,
): ExplainSymbolRequest | null =>
  selectModeView(view, mode)?.renderable ? { symbol: view.symbol, mode } : null;

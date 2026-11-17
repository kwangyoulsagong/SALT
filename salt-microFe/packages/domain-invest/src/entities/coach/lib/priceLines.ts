import type { ScenarioHorizonView } from "@repo/core/coach";
import type { TradingPriceLine as PriceLine } from "@repo/ui/tradingChart";

import { PANEL_MESSAGES } from "../model";

/**
 * 틀리는 선 → 차트 가격선 하나(F017 v4 순서 6 · `FE-REQ-064` FR-12 "관찰 구간 → 차트 위 틀리는 선").
 *
 * 가격은 서버 `invalidation` 그대로 — 한 장 패널 ④ 줄과 같은 칸(같은 기간 탭)이라 두 자리가 다른 값을 말하지 않는다.
 * 결함 칸 · 선 없음이면 선도 없다(지어내지 않는다). 하락 색 실선 + "틀리는 선" 글자(색만으로 말하지 않는다).
 * ~~구간 → 가격선 · 띠(`zoneToPriceLines` · `zoneToPriceBand`, `FE-REQ-026` FR-132 · `FE-REQ-036`)~~ — 매수 · 관찰 구간 선 · 띠 · 범례는
 * 화면에서 뺐다(계산은 서버에 남는다 — 익절 플랜 표가 같은 구간을 그대로 쓴다)
 */
export const invalidationToPriceLines = (
  view: Pick<ScenarioHorizonView, "tier" | "invalidation"> | undefined,
): PriceLine[] =>
  view && view.tier !== "defect" && view.invalidation !== null
    ? [{ key: "invalidation", price: view.invalidation, tone: "down", dashed: false, label: PANEL_MESSAGES.gaugeLine }]
    : [];

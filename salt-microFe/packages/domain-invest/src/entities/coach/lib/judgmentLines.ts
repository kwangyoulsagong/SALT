import type { JudgmentCaveat } from "@repo/core/coach";

import { COACH_MESSAGES } from "../model";

const M = COACH_MESSAGES;

/** 꼬리표 하나 → 문장(서버 사실 칸을 끼운다). `unknown` 은 그리지 않는다 */
export const caveatSentence = (caveat: JudgmentCaveat): string | null => {
  switch (caveat.reason) {
    case "insufficient_history":
      return M.caveat.insufficient_history(caveat.have, caveat.need, caveat.dailyIndicator);
    case "exchange_warning":
      return M.caveat.exchange_warning;
    case "stale_inputs":
      return M.caveat.stale_inputs(
        caveat.items.map((row) => `${M.caveatTime(row.lastAt)} ${M.caveat.staleItem[row.item] ?? ""}`.trim()).join(" · "),
      );
    case "live_sample_short":
      return M.caveat.live_sample_short(caveat.live, caveat.backtest);
    case "inputs_missing":
      return M.caveat.inputs_missing;
    case "track_record_unavailable":
      return M.caveat.track_record_unavailable;
    case "backtest_missing":
      return M.caveat.backtest_missing(caveat.live);
    case "unknown":
      return null;
  }
};

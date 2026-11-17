import type { RiskBudgetView } from "@repo/core/coach";

import { RISK_MESSAGES } from "../model";
import { formatRatio } from "./format";

const betaFormatter = new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const S = RISK_MESSAGES.summary;

export interface RiskSummaryLine {
  value: string;
  notes: string[];
  /** 이번 달 손실 예산을 넘었나 — 넘을 때만 강조(F017 v4 순서 6 · `FE-REQ-064` FR-12 "위험 예산 한 줄") */
  exceeded: boolean;
}

/**
 * 위험 예산 한 줄 — 투자 화면 요약 띠 칸과 코치 리포트 패널이 같은 문장을 쓴다(같은 계산을 두 곳에 두지 않는다).
 * 값 · 상태는 전부 서버 게이지(`drawdown` · `concentration` · `btcBeta`) — 여기는 문장 틀에 넣기만. BTC 동조는 코인 몫이라 국내 탭엔 뺀다
 */
export const riskSummaryLine = (view: RiskBudgetView, withBeta: boolean): RiskSummaryLine => {
  const { drawdown, concentration, btcBeta } = view.gauges;
  const exceeded = drawdown.status === "exceeded" && drawdown.usedRate !== null;
  const value =
    drawdown.status === "budget_not_set"
      ? S.budgetNotSet
      : drawdown.status === "insufficient_data" || drawdown.usedRate === null
        ? S.insufficient
        : exceeded
          ? S.drawdownExceeded(formatRatio(drawdown.usedRate))
          : S.drawdownUsed(formatRatio(drawdown.usedRate));
  const notes = [
    concentration.topSymbol && concentration.topWeight !== null
      ? S.top(concentration.topSymbol, formatRatio(concentration.topWeight))
      : null,
    withBeta && btcBeta.betaSum !== null ? S.beta(betaFormatter.format(btcBeta.betaSum)) : null,
  ].filter((note): note is string => note !== null);
  return { value, notes, exceeded };
};

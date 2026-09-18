import type {
  CoachContext,
  CoachPayload,
  CoachReason,
  CoachRisk,
  RiskLevel,
  ScoredCandidate,
} from "../model";

/**
 * 근거·리스크·가이드 조립 — `ai-coach-explainer` 에서 옮겨온 **순수 조립**.
 *
 * 점수 요인(`ScoreFactor`)을 사용자에게 보여줄 문장으로 옮긴다. **LLM 이 여기 없다** —
 * 이 문장들은 전부 우리가 만든 것이고, LLM 은 `CoachExplainer` Port 뒤에서
 * 해설만 덧붙인다(`ddd-infrastructure.md` §6 — "문장만 생성, 숫자는 주입").
 *
 * ## 확신 표현·목표주가가 없다
 *
 * 전 영역 공통 수용 기준 4다. 원문 문구가 이미 "검토하세요" · "유리할 수 있습니다"
 * 형태였고 그대로 옮겼다. 여기에 수익률 예측을 넣지 않는다.
 */

const buildActionGuide = (
  ctx: CoachContext,
  top: ScoredCandidate
): string[] => {
  const guides: string[] = [];

  if (top.action === "buy") {
    guides.push(`${top.symbol}는 한 번에 진입하지 말고 분할 매수를 고려하세요.`);
    guides.push(
      "추가 비중은 전체 포트폴리오 집중도를 해치지 않는 범위로 제한하세요."
    );
  }

  if (top.action === "sell") {
    guides.push(`${top.symbol}는 일부 차익실현 또는 비중 축소를 검토하세요.`);
    guides.push(
      "전량 정리보다 부분 매도로 리스크를 관리하는 접근이 유리할 수 있습니다."
    );
  }

  if (top.action === "hold") {
    guides.push("현재 포지션을 유지하면서 다음 신호를 관찰하세요.");
    guides.push("무리한 추가 매수보다 시장 방향성을 확인하는 것이 좋습니다.");
  }

  if (top.action === "rebalance") {
    guides.push("포트폴리오 비중 재조정을 우선 검토하세요.");
    guides.push("집중 자산 비중을 줄이고 분산도를 높이는 방향이 유리합니다.");
  }

  if (ctx.behaviorInsights.length > 0) {
    guides.push(
      "최근 거래 패턴상 감정적 매매를 줄이고 계획된 진입/청산이 필요합니다."
    );
  }

  return guides.slice(0, 3);
};

const buildSummary = (params: {
  action: string;
  symbol: string;
  marketRegime: string;
  reasons: CoachReason[];
  risks: CoachRisk[];
  actions: string[];
}): string => {
  const actionText =
    params.action === "buy"
      ? "매수 고려"
      : params.action === "sell"
        ? "일부 매도 고려"
        : params.action === "rebalance"
          ? "리밸런싱 고려"
          : "보유 유지";

  const reasonText =
    params.reasons.length > 0
      ? params.reasons
          .slice(0, 3)
          .map((r) => `• ${r.message}`)
          .join("\n")
      : "• 유의미한 긍정 신호가 제한적입니다.";

  const riskText =
    params.risks.length > 0
      ? params.risks
          .slice(0, 3)
          .map((r) => `• ${r.message}`)
          .join("\n")
      : "• 현재 감지된 핵심 리스크는 제한적입니다.";

  const actionGuide =
    params.actions.length > 0
      ? params.actions.map((a) => `• ${a}`).join("\n")
      : "• 현재 포트폴리오를 유지하며 신호를 관찰하세요.";

  return [
    "AI 투자 코치",
    `시장 상태: ${params.marketRegime}`,
    "",
    "추천",
    `${params.symbol} ${actionText}`,
    "",
    "근거",
    reasonText,
    "",
    "리스크",
    riskText,
    "",
    "가이드",
    actionGuide,
  ].join("\n");
};

export interface CoachExplanationResult {
  summary: string;
  payload: CoachPayload;
}

export const explainRecommendation = (
  ctx: CoachContext,
  top: ScoredCandidate,
  ranked: ScoredCandidate[]
): CoachExplanationResult => {
  const reasons: CoachReason[] = top.positiveFactors.slice(0, 5).map((f) => ({
    type: f.key,
    message: f.message,
    value: f.score,
  }));

  const risks: CoachRisk[] = top.negativeFactors.slice(0, 5).map((f) => ({
    type: f.key,
    symbol: top.symbol,
    message: f.message,
    severity: Math.min(100, Math.abs(f.score) * 5),
  }));

  if (ctx.behaviorInsights.length > 0) {
    for (const behavior of ctx.behaviorInsights.slice(0, 2)) {
      risks.push({
        type: "behavior",
        message: behavior.summary,
        severity: behavior.severity,
      });
    }
  }

  const actions = buildActionGuide(ctx, top);

  const summary = buildSummary({
    action: top.action,
    symbol: top.symbol,
    marketRegime: ctx.marketRegime,
    reasons,
    risks,
    actions,
  });

  const payload: CoachPayload = {
    recommendation: { action: top.action, symbol: top.symbol, score: top.score },
    candidates: ranked.map((r) => ({
      action: r.action,
      symbol: r.symbol,
      score: r.score,
    })),
    market: { regime: ctx.marketRegime },
    portfolio: ctx.portfolioState,
    reasons,
    risks,
    actions,
    debug: {
      topCandidateFactors: [
        ...top.positiveFactors.slice(0, 5),
        ...top.negativeFactors.slice(0, 5),
      ],
    },
  };

  return { summary, payload };
};

/** 알림 강도. 집중도가 높을수록 올라간다. 상한 100. */
export const calculateSeverity = (
  topScore: number,
  portfolioRiskLevel: RiskLevel
): number => {
  let severity = Math.min(100, Math.max(35, topScore));

  if (portfolioRiskLevel === "medium") severity += 5;
  if (portfolioRiskLevel === "high") severity += 10;

  return Math.min(100, severity);
};

/**
 * 신뢰도. **1등과 2등의 점수 차**가 클수록 올라가고 상한이 0.92 다.
 *
 * 상한이 1 이 아닌 것이 이 제품의 규칙이다 — 확신 표현을 하지 않는다.
 */
export const calculateConfidence = (
  topScore: number,
  secondScore: number
): number => {
  const spread = Math.max(0, topScore - secondScore);
  const raw =
    0.55 + Math.min(0.3, spread / 100) + Math.min(0.1, topScore / 200);
  return Math.min(0.92, Number(raw.toFixed(2)));
};

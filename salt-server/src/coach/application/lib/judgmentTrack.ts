import {
  JUDGMENT_CASE_LIMIT,
  judgmentGate,
  judgmentSignalType,
  summarizeJudgmentTrack,
  type CoachMode,
  type JudgmentBlockedReason,
  type JudgmentCase,
  type JudgmentTrackRecord,
  type ModeDecision,
  type SymbolJudgmentStore,
} from "../../domain";

/** 점수 옆에 늘 붙는 문장 (공통 수용 기준 4 — 확신 표현 0건). */
export const SCORE_NOTE = "점수는 확률이 아닙니다";

export const JUDGMENT_DISCLAIMER =
  "과거 판단의 결과이며 앞으로의 수익을 뜻하지 않습니다. 주문은 직접 결정하세요.";

/** 유효시간의 유일한 출처 (`SRV-REQ-025` FR-45). 문구는 프론트 i18n 이 만든다. */
const VALIDITY_CODE: Record<CoachMode, "scalp_5m_24h" | "long_term_1w_1y"> = {
  scalp: "scalp_5m_24h",
  long_term: "long_term_1w_1y",
};

export interface JudgmentCaseView {
  /** 판단 날짜 (`YYYY-MM-DD`, UTC). */
  date: string;
  symbol: string;
  /** 성적표 그룹 키 — `<mode>.<action>`. 문구가 아니라 코드다. */
  event: string;
  outcome: "hit" | "miss";
  /** 관찰 기간 수익률. **과거 값**이다. */
  returnRate: number;
}

export interface ModeCoachView {
  judgment: {
    action: ModeDecision["action"];
    label: string;
    score: number;
    scoreNote: string;
    validity: { code: string };
    riskLevel: ModeDecision["riskLevel"];
    headline: string;
    reasons: string[];
    risks: string[];
  };
  signalType: string;
  renderable: boolean;
  blockedReason: JudgmentBlockedReason | null;
  trackRecord: JudgmentTrackRecord;
  failureCases: JudgmentCaseView[];
}

/**
 * 사례 하나를 화면 모양으로. `event` 는 그룹 키(`<mode>.<action>`)다 — 사례는 그 키로
 * 뽑았으니 다시 만들지 않고 받는다. 성적표(`GetJudgmentScoreboard`)와 판단 블록이
 * **같은 함수**를 쓴다: 적중과 실패가 같은 모양이어야 한다(B2).
 */
export const toCaseView = (
  event: string,
  outcome: "hit" | "miss",
  item: JudgmentCase
): JudgmentCaseView => ({
  date: item.judgedAt.toISOString().slice(0, 10),
  symbol: item.symbol,
  event,
  outcome,
  returnRate: item.returnRate,
});

/**
 * 모드 하나의 판단에 성적표 · 실패사례 · 게이트를 붙인다.
 *
 * 성적은 **같은 판단 유형 전체**(`<mode>.<action>`)의 것이다 — 이 종목만의 성적이 아니다.
 * 종목 하나로는 장기 판단이 30일에 1표본이라 20건이 쌓이는 데 1년 반이 걸린다.
 */
export const attachJudgmentTrack = async (
  store: SymbolJudgmentStore,
  decision: ModeDecision
): Promise<ModeCoachView> => {
  const signalType = judgmentSignalType(decision.mode, decision.action);

  const [stats, misses] = await Promise.all([
    store.summarize(signalType),
    store.recentCases(signalType, "miss", JUDGMENT_CASE_LIMIT),
  ]);

  const trackRecord = summarizeJudgmentTrack(decision.mode, signalType, stats);
  const gate = judgmentGate({
    action: decision.action,
    reasons: decision.reasons,
    risks: decision.risks,
    trackRecord,
    failureCases: misses,
  });

  return {
    judgment: {
      action: decision.action,
      label: decision.label,
      score: decision.score,
      scoreNote: SCORE_NOTE,
      validity: { code: VALIDITY_CODE[decision.mode] },
      riskLevel: decision.riskLevel,
      headline: decision.headline,
      reasons: decision.reasons,
      risks: decision.risks,
    },
    signalType,
    renderable: gate.renderable,
    blockedReason: gate.blockedReason,
    trackRecord,
    failureCases: misses.map((item) => toCaseView(signalType, "miss", item)),
  };
};

import {
  COACH_HORIZON,
  JUDGMENT_CASE_LIMIT,
  judgmentGate,
  judgmentSignalType,
  summarizeJudgmentTrack,
  type CoachMode,
  type JudgmentAssetClass,
  type JudgmentBlockedReason,
  type JudgmentCase,
  type JudgmentTrackRecord,
  type KrJudgmentHistory,
  type ModeDecision,
  type StaleInput,
  type SymbolJudgmentStore,
} from "../../domain";

/** 점수 옆에 늘 붙는 문장 (공통 수용 기준 4 — 확신 표현 0건). */
export const SCORE_NOTE = "점수는 확률이 아닙니다";

export const JUDGMENT_DISCLAIMER =
  "과거 판단의 결과이며 앞으로의 수익을 뜻하지 않습니다. 주문은 직접 결정하세요.";


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
  /** 성적이 세는 자산군(F011 FR-61 · 65) — 국내 주식 판단은 국내 주식 표본만 센다 */
  assetClass: JudgmentAssetClass;
  /**
   * 국내 주식만 — 판단을 여는 이력의 지금 수치(F011 FR-62, "일봉 63 / 120 · 표본 0 / 20"). 표본은 `trackRecord.sample` 이다.
   * 코인은 없다
   */
  history?: KrJudgmentHistory;
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
 * 성적과 무관하게 판정을 막는 조건 — 거래소 투자유의(슬라이스 6) · 오래된 재료(슬라이스 7) ·
 * 자산군에 아직 열지 않은 모드 · 국내 주식 이력(F011 슬라이스 4).
 */
export interface JudgmentGuards {
  exchangeWarning?: boolean;
  staleInputs?: readonly StaleInput[];
  modeNotOpen?: boolean;
  history?: KrJudgmentHistory;
}

/**
 * 모드 하나의 판단에 성적표 · 실패사례 · 게이트를 붙인다.
 *
 * 성적은 **같은 판단 유형 전체**(`<mode>.<action>`)의 것이다 — 이 종목만의 성적이 아니다.
 * 종목 하나로는 장기 판단이 30일에 1표본이라 20건이 쌓이는 데 1년 반이 걸린다.
 */
export const attachJudgmentTrack = async (
  store: SymbolJudgmentStore,
  decision: ModeDecision,
  guards: JudgmentGuards = {},
  assetClass: JudgmentAssetClass = "crypto"
): Promise<ModeCoachView> => {
  const signalType = judgmentSignalType(decision.mode, decision.action, assetClass);

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
    exchangeWarning: guards.exchangeWarning ?? false,
    staleInputs: guards.staleInputs ?? [],
    modeNotOpen: guards.modeNotOpen ?? false,
    historyShort: guards.history ? !guards.history.ready : false,
  });

  return {
    judgment: {
      action: decision.action,
      label: decision.label,
      score: decision.score,
      scoreNote: SCORE_NOTE,
      validity: { code: COACH_HORIZON[decision.mode].validityCode },
      riskLevel: decision.riskLevel,
      headline: decision.headline,
      reasons: decision.reasons,
      risks: decision.risks,
    },
    signalType,
    assetClass,
    ...(guards.history ? { history: guards.history } : {}),
    renderable: gate.renderable,
    blockedReason: gate.blockedReason,
    trackRecord,
    failureCases: misses.map((item) => toCaseView(signalType, "miss", item)),
  };
};

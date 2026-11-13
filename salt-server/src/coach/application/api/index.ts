import { ReportTriadGaps } from "../ReportTriadGaps";
import type {
  CoachExplainer,
  ExplanationSnapshotStore,
  LlmBudgetLimits,
  LlmUsageStore,
  CoachGenerationLogStore,
  CoachInsightStore,
  CoachNotifier,
  CoachProfileStore,
  GaugeTrackStore,
  MarketProbe,
  NewsProbe,
  PortfolioProbe,
  JudgmentLedgerStore,
  SymbolJudgmentStore,
  ForecastReader,
  TrackedAssetProbe,
  CoachedUsersReader,
  TradePlanStore,
  DecisionOutcomeStore,
  MonthlyReviewStore,
  RecommendationSnapshotStore,
  RoundTripCosts,
  BaseRateReader,
  JudgmentTierReader,
  ShortHorizonReader,
  TradeCheckLedger,
  MoveCardReader,
  MoveSummaryStore,
  MoveSummaryWriter,
} from "../../domain";
import { AnalyzeNewsSentiment } from "../AnalyzeNewsSentiment";
import {
  AnalyzeTradingBehavior,
  GetBehaviorCoach,
} from "../AnalyzeTradingBehavior";
import { CheckTradeOdds } from "../CheckTradeOdds";
import { CheckTradePreflight } from "../CheckTradePreflight";
import { CheckTradeSize } from "../CheckTradeSize";
import { PreviewTradeBehavior } from "../PreviewTradeBehavior";
import { EvaluateTradeDecisions } from "../EvaluateTradeDecisions";
import { ListCoachedUsers } from "../ListCoachedUsers";
import { GenerateExplanationSnapshots } from "../GenerateExplanationSnapshots";
import { GenerateMoveSummaries } from "../GenerateMoveSummaries";
import { GetMoveSummary } from "../GetMoveSummary";
import { MoveSummaryDemand } from "../lib/moveSummaryDemand";
import { GetSymbolExplanation } from "../GetSymbolExplanation";
import { ExplanationDemand } from "../lib/explanationDemand";
import { GenerateCoachRecommendation } from "../GenerateCoachRecommendation";
import { GetBehaviorMirror } from "../GetBehaviorMirror";
import { GetKrBehaviorMirror } from "../GetKrBehaviorMirror";
import { GetCoachDetail } from "../GetCoachDetail";
import { GetCoachGenerationStatus } from "../GetCoachGenerationStatus";
import { GetCoachRecommendation } from "../GetCoachRecommendation";
import { GetJudgmentScoreboard } from "../GetJudgmentScoreboard";
import { GetSymbolEvents } from "../GetSymbolEvents";
import { GetSymbolScenario } from "../GetSymbolScenario";
import { GetSymbolPositioning } from "../GetSymbolPositioning";
import { GetSignalPerformance } from "../GetSignalPerformance";
import { GetSymbolCoach } from "../GetSymbolCoach";
import { ListProfitPlans } from "../ListProfitPlans";
import { GetCoachProfile, UpdateCoachProfile } from "../ManageCoachProfile";
import { ConfirmOutcomeTags, ListDecisionOutcomes } from "../ManageDecisionOutcomes";
import { GetRiskBudget, UpdateRiskBudget } from "../ManageRiskBudget";
import { GetTargetWeights } from "../GetTargetWeights";
import { BuildMonthlyReview, GetMonthlyReview } from "../ManageMonthlyReview";
import { CreateTradePlan, ListTradePlans, UpdateTradePlan } from "../ManageTradePlan";
import { RecordCoachFeedback } from "../RecordCoachFeedback";
import { EvaluateCoachRecommendations } from "../RecordCoachRecommendations";
import {
  EvaluateSymbolJudgments,
  SnapshotSymbolJudgments,
} from "../RecordSymbolJudgments";
import { PublishJudgmentLedger } from "../PublishJudgmentLedger";
import { RefreshGaugeTrackRecords } from "../RefreshGaugeTrackRecords";
import { RequestCoachGeneration } from "../RequestCoachGeneration";

/**
 * `coach` 의 조립 팩토리.
 *
 * ## 공개 API(`api`)가 아직 없다
 *
 * 다른 컨텍스트가 코치를 부르는 곳이 **지금 하나도 없다.** 소비처 없이 인터페이스를
 * 열면 그 모양이 첫 소비처를 끌려가게 만든다(`ddd-application.md` §6 — "공개 API 를
 * 늘리기 전에 묻는다").
 *
 * 첫 소비처는 F006 홈 브리핑(조합 컨텍스트 `homebriefing`)이고, 그때 **그 화면이
 * 실제로 읽는 것**만 열면 된다. 그래서 이 팩토리는 `useCases` 만 돌려준다 —
 * 자기 `presentation` 과 워커가 쓰는 것이다.
 */

export interface CoachDependencies {
  profiles: CoachProfileStore;
  insights: CoachInsightStore;
  market: MarketProbe;
  portfolio: PortfolioProbe;
  news: NewsProbe;
  notifier: CoachNotifier;
  explainer: CoachExplainer;
  /** 해설 스냅샷(`explanation_snapshot`, `DB-REQ-043` FR-1) — 배치가 쓰고 읽기가 읽는다 */
  explanations: ExplanationSnapshotStore;
  /** LLM 시도 원장 — 해설 비용 상한(F010 슬라이스 7). 같은 원장을 `explainer` 구현도 받아 시도마다 쓴다 */
  llmUsage?: LlmUsageStore;
  llmLimits?: Partial<LlmBudgetLimits>;
  /** 해설 LLM 다듬기 — 없으면 켜짐. 운영 조립은 env(`COACH_EXPLAIN_LLM`, 기본 on) */
  llmEnabled?: boolean;
  judgments: SymbolJudgmentStore;
  /** 국내 주식 판단 백테스트 성적(`backtest` 출처만) — 종목 판단 카드만 읽는다(F011 슬라이스 7b). 없으면 라이브만 */
  backtestJudgments?: SymbolJudgmentStore | null;
  ledger: JudgmentLedgerStore;
  /** 저장 추천 스냅샷 원장(F010 슬라이스 0) */
  recommendations: RecommendationSnapshotStore;
  tracked: TrackedAssetProbe;
  /** 사람마다 배치의 대상(서버 S3b — `users` 를 읽지 않는다) */
  coachedUsers: CoachedUsersReader;
  /**
   * 오늘 등락 한 줄(F016 단계 D). 없으면 꺼짐(`disabled`) — 테스트 조립 · `MOVE_SUMMARY=off`
   */
  moveSummary?: {
    cards: MoveCardReader;
    store: MoveSummaryStore;
    writer: MoveSummaryWriter;
    names: (symbols: string[]) => Promise<Map<string, string>>;
    enabled: boolean;
  };
  gauges: GaugeTrackStore;
  generationLogs: CoachGenerationLogStore;
  /** 수동 재생성 쿨다운(초). **설정값**이다(`SRV-REQ-024` FR-82) — env 에서 온다 */
  regenerateCooldownSeconds: number;
  /** 전망 계약 뷰 읽기(F008) — 사건 · 쏠림 · 변동성 · 국면(주간 변동 범위 `v_forecast_card` 읽기는 2026-11-12 삭제) */
  forecasts: ForecastReader;
  /** 전망 소유자 이메일(ADR-003) — env 에서 온다. 비면 아무도 못 본다 */
  forecastOwnerEmails: readonly string[];
  /** 판단 채점 · 기저율의 자산군별 왕복 비용(F011 FR-64) — 국내 주식은 env `KR_STOCK_ROUND_TRIP_FEE_RATE` */
  roundTripCosts: RoundTripCosts;
  /** 거래 계획(F009 슬라이스 1) — `trade_plans` */
  tradePlans: TradePlanStore;
  /** 결정 결과(F009 슬라이스 4) — `decision_outcomes` */
  decisionOutcomes: DecisionOutcomeStore;
  /** 월간 복기(F009 슬라이스 6) — `monthly_reviews` */
  monthlyReviews: MonthlyReviewStore;
  /** 조건부 기저율(F017 v2 단계 2) — `forecast.v_base_rate` · `v_base_rate_trigger` */
  baseRates: BaseRateReader;
  /** 라벨 등급(예측 뷰 `v_judgment_tier`, F017 v2 단계 4) — 없으면 참고 */
  judgmentTiers?: JudgmentTierReader | null;
  /** 단타 방향 확률 뷰(F017 v2 단계 5) */
  shortHorizons: ShortHorizonReader;
  /** 점검 원장(F017 v2 단계 2) — `trade_check_ledger` */
  tradeCheckLedger: TradeCheckLedger;
}

export interface CoachUseCases {
  /** 3종 결함 10분 줄(`SRV-REQ-053` FR-8) */
  reportTriadGaps: ReportTriadGaps;
  generateRecommendation: GenerateCoachRecommendation;
  requestGeneration: RequestCoachGeneration;
  getGenerationStatus: GetCoachGenerationStatus;
  getRecommendation: GetCoachRecommendation;
  getCoachDetail: GetCoachDetail;
  getSymbolCoach: GetSymbolCoach;
  getProfile: GetCoachProfile;
  updateProfile: UpdateCoachProfile;
  recordFeedback: RecordCoachFeedback;
  /** 해설 읽기 — 저장값만, 4단(F017 v2 단계 3 · `SRV-REQ-053` FR-3) */
  getSymbolExplanation: GetSymbolExplanation;
  /** 해설 스냅샷 배치 — 워커가 부른다. 지문이 바뀐 종목만 LLM(FR-3 ②) */
  generateExplanationSnapshots: GenerateExplanationSnapshots;
  /** 오늘 등락 한 줄(③) 읽기 — 저장값과 지금 카드 대조만, LLM 0(F016 단계 D · `SRV-REQ-052`) */
  getMoveSummary: GetMoveSummary;
  /** 오늘 등락 한 줄 배치 — 해설 배치 뒤 같은 LLM 워커 */
  generateMoveSummaries: GenerateMoveSummaries;
  analyzeNewsSentiment: AnalyzeNewsSentiment;
  analyzeTradingBehavior: AnalyzeTradingBehavior;
  getBehaviorCoach: GetBehaviorCoach;
  checkTradePreflight: CheckTradePreflight;
  /** 사기 전 · 팔기 전 점검 + 맨 위 쉬운 한 줄(F017 v2 단계 2 · `SRV-REQ-053` FR-4) */
  checkTradeOdds: CheckTradeOdds;
  listProfitPlans: ListProfitPlans;
  getSignalPerformance: GetSignalPerformance;
  getJudgmentScoreboard: GetJudgmentScoreboard;
  /** 시나리오 카드 — 단타 방향 확률, 소유자만(F017 v2 단계 5 · `SRV-REQ-053` FR-5) */
  getSymbolScenario: GetSymbolScenario;
  /** 주요 사건(거시 일정) · 과거 반응 — 소유자만(F008 슬라이스 22) */
  getSymbolEvents: GetSymbolEvents;
  /** 쏠림 신호(펀딩비 · 김치 프리미엄) · 과거 반응 — 소유자만(F008 슬라이스 23) */
  getSymbolPositioning: GetSymbolPositioning;
  snapshotSymbolJudgments: SnapshotSymbolJudgments;
  publishJudgmentLedger: PublishJudgmentLedger;
  evaluateSymbolJudgments: EvaluateSymbolJudgments;
  /** 30일 지난 저장 추천 스냅샷 채점(F010 슬라이스 0) */
  evaluateCoachRecommendations: EvaluateCoachRecommendations;
  refreshGaugeTrackRecords: RefreshGaugeTrackRecords;
  /** F009 슬라이스 1 — 사이즈 계산 · 계획 · 리스크 예산 */
  checkTradeSize: CheckTradeSize;
  createTradePlan: CreateTradePlan;
  updateTradePlan: UpdateTradePlan;
  listTradePlans: ListTradePlans;
  getRiskBudget: GetRiskBudget;
  updateRiskBudget: UpdateRiskBudget;
  /** F010 슬라이스 5 — 확률 없는 목표 비중 안내 */
  getTargetWeights: GetTargetWeights;
  /** F009 슬라이스 4 — 준수 판정 · 결정 결과 배치 · 미러 · 태그 확정 */
  evaluateTradeDecisions: EvaluateTradeDecisions;
  /** 사람마다 배치의 대상 — 워커가 준수 판정 · 월간 복기 · 리밸런스 전에 부른다 */
  listCoachedUsers: ListCoachedUsers;
  getBehaviorMirror: GetBehaviorMirror;
  getKrBehaviorMirror: GetKrBehaviorMirror;
  listDecisionOutcomes: ListDecisionOutcomes;
  confirmOutcomeTags: ConfirmOutcomeTags;
  /** F009 슬라이스 6 — 월간 복기(월초 배치 · 첫 조회가 만든다) */
  buildMonthlyReview: BuildMonthlyReview;
  getMonthlyReview: GetMonthlyReview;
}

export const createCoachApplication = (deps: CoachDependencies) => {
  const symbolCoach = new GetSymbolCoach(
    deps.market,
    deps.portfolio,
    deps.profiles,
    deps.judgments,
    deps.gauges,
    undefined,
    deps.forecasts,
    deps.backtestJudgments ?? null,
    deps.judgmentTiers ?? null
  );
  const analyzeNewsSentiment = new AnalyzeNewsSentiment(deps.news);
  const analyzeTradingBehavior = new AnalyzeTradingBehavior(
    deps.profiles,
    deps.market,
    deps.portfolio
  );

  const generateRecommendation = new GenerateCoachRecommendation(
    deps.profiles,
    deps.insights,
    deps.market,
    deps.portfolio,
    deps.notifier,
    analyzeNewsSentiment,
    symbolCoach,
    deps.generationLogs,
    undefined,
    analyzeTradingBehavior,
    deps.recommendations,
    deps.forecasts
  );

  const getRiskBudget = new GetRiskBudget(deps.profiles, deps.portfolio, deps.market, deps.forecasts);
  const buildMonthlyReview = new BuildMonthlyReview(
    deps.monthlyReviews,
    deps.profiles,
    deps.portfolio,
    deps.tradePlans,
    deps.decisionOutcomes,
    deps.forecasts,
    deps.market
  );

  // 해설 — 배치와 읽기가 같은 재료 함수 · 같은 "본 종목" 기억을 쓴다(F017 v2 단계 3)
  const explanationMaterials = {
    market: deps.market,
    news: deps.news,
    judgments: deps.judgments,
    backtestJudgments: deps.backtestJudgments ?? null,
  };
  const explanationDemand = new ExplanationDemand();
  const moveSummaryDemand = new MoveSummaryDemand();
  const moveSummary = deps.moveSummary ?? {
    cards: { card: async () => null },
    store: { day: async () => ({ current: null, latestOk: null, attempts: 0 }), save: async () => false },
    writer: { write: async () => Promise.reject(new Error("오늘 등락 한 줄 꺼짐")) },
    names: async () => new Map<string, string>(),
    enabled: false,
  };

  const useCases: CoachUseCases = {
    reportTriadGaps: new ReportTriadGaps(),
    generateRecommendation,
    requestGeneration: new RequestCoachGeneration(
      deps.generationLogs,
      generateRecommendation,
      deps.regenerateCooldownSeconds
    ),
    getGenerationStatus: new GetCoachGenerationStatus(
      deps.generationLogs,
      deps.regenerateCooldownSeconds
    ),
    getRecommendation: new GetCoachRecommendation(deps.insights, symbolCoach),
    getCoachDetail: new GetCoachDetail(
      deps.insights,
      deps.market,
      deps.portfolio,
      deps.recommendations,
      undefined,
      analyzeTradingBehavior,
      deps.forecasts,
      deps.judgments
    ),
    getSymbolCoach: symbolCoach,
    getProfile: new GetCoachProfile(deps.profiles),
    updateProfile: new UpdateCoachProfile(deps.profiles),
    recordFeedback: new RecordCoachFeedback(deps.insights),
    getSymbolExplanation: new GetSymbolExplanation({ ...explanationMaterials, store: deps.explanations, demand: explanationDemand }),
    generateExplanationSnapshots: new GenerateExplanationSnapshots({
      ...explanationMaterials,
      explainer: deps.explainer,
      store: deps.explanations,
      tracked: deps.tracked,
      demand: explanationDemand,
      usage: deps.llmUsage,
      limits: deps.llmLimits,
      // 없으면 켜짐(지금 동작). `COACH_EXPLAIN_LLM=off` 면 배치가 만들지 않는다 — 화면은 사실표 문장
      llmEnabled: deps.llmEnabled !== false,
    }),
    getMoveSummary: new GetMoveSummary({ ...moveSummary, demand: moveSummaryDemand }),
    generateMoveSummaries: new GenerateMoveSummaries({
      ...moveSummary,
      tracked: deps.tracked,
      demand: moveSummaryDemand,
      usage: deps.llmUsage,
      limits: deps.llmLimits,
    }),
    analyzeNewsSentiment,
    analyzeTradingBehavior,
    getBehaviorCoach: new GetBehaviorCoach(deps.portfolio, analyzeTradingBehavior),
    checkTradePreflight: new CheckTradePreflight(
      deps.market,
      deps.portfolio,
      deps.profiles
    ),
    listProfitPlans: new ListProfitPlans(deps.portfolio, deps.forecasts),
    getSignalPerformance: new GetSignalPerformance(deps.recommendations),
    getJudgmentScoreboard: new GetJudgmentScoreboard(
      deps.judgments,
      deps.backtestJudgments ?? null,
      deps.market
    ),
    getSymbolScenario: new GetSymbolScenario(deps.shortHorizons, deps.baseRates, deps.market, deps.forecastOwnerEmails),
    getSymbolEvents: new GetSymbolEvents(deps.forecasts, deps.forecastOwnerEmails),
    checkTradeOdds: new CheckTradeOdds(deps.market, deps.portfolio, deps.baseRates, deps.tradeCheckLedger),
    getSymbolPositioning: new GetSymbolPositioning(deps.forecasts, deps.forecastOwnerEmails),
    snapshotSymbolJudgments: new SnapshotSymbolJudgments(
      deps.tracked,
      deps.market,
      deps.judgments
    ),
    publishJudgmentLedger: new PublishJudgmentLedger(
      deps.tracked,
      deps.market,
      deps.ledger,
      undefined,
      deps.forecasts
    ),
    evaluateSymbolJudgments: new EvaluateSymbolJudgments(
      deps.market,
      deps.judgments,
      undefined,
      deps.roundTripCosts
    ),
    evaluateCoachRecommendations: new EvaluateCoachRecommendations(
      deps.market,
      deps.recommendations
    ),
    refreshGaugeTrackRecords: new RefreshGaugeTrackRecords(
      deps.market,
      deps.gauges
    ),
    checkTradeSize: new CheckTradeSize(
      deps.profiles,
      deps.portfolio,
      deps.market,
      deps.forecasts,
      undefined,
      new PreviewTradeBehavior(deps.portfolio, deps.tradePlans, deps.decisionOutcomes, deps.market),
      deps.roundTripCosts
    ),
    createTradePlan: new CreateTradePlan(deps.tradePlans, deps.portfolio),
    updateTradePlan: new UpdateTradePlan(deps.tradePlans, deps.portfolio),
    listTradePlans: new ListTradePlans(deps.tradePlans),
    getRiskBudget,
    updateRiskBudget: new UpdateRiskBudget(deps.profiles, getRiskBudget),
    getTargetWeights: new GetTargetWeights(deps.profiles, deps.portfolio, deps.market, deps.forecasts),
    listCoachedUsers: new ListCoachedUsers(deps.coachedUsers),
    evaluateTradeDecisions: new EvaluateTradeDecisions(
      deps.portfolio,
      deps.tradePlans,
      deps.decisionOutcomes,
      deps.forecasts,
      deps.market
    ),
    getBehaviorMirror: new GetBehaviorMirror(
      deps.portfolio,
      deps.tradePlans,
      deps.decisionOutcomes,
      deps.forecasts
    ),
    getKrBehaviorMirror: new GetKrBehaviorMirror(
      deps.portfolio,
      deps.forecasts,
      deps.market,
      deps.tradePlans,
      deps.decisionOutcomes
    ),
    listDecisionOutcomes: new ListDecisionOutcomes(deps.decisionOutcomes, deps.market),
    confirmOutcomeTags: new ConfirmOutcomeTags(deps.decisionOutcomes),
    buildMonthlyReview,
    getMonthlyReview: new GetMonthlyReview(
      deps.monthlyReviews,
      buildMonthlyReview,
      deps.market
    ),
  };

  return { useCases };
};

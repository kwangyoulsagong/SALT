import type {
  CoachExplainer,
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
  TradePlanStore,
  DecisionOutcomeStore,
  MonthlyReviewStore,
  RecommendationSnapshotStore,
} from "../../domain";
import { AnalyzeNewsSentiment } from "../AnalyzeNewsSentiment";
import {
  AnalyzeTradingBehavior,
  GetBehaviorCoach,
} from "../AnalyzeTradingBehavior";
import { CheckTradePreflight } from "../CheckTradePreflight";
import { CheckTradeSize } from "../CheckTradeSize";
import { PreviewTradeBehavior } from "../PreviewTradeBehavior";
import { EvaluateTradeDecisions } from "../EvaluateTradeDecisions";
import { ExplainCoachDecision } from "../ExplainCoachDecision";
import { GenerateCoachRecommendation } from "../GenerateCoachRecommendation";
import { GetBehaviorMirror } from "../GetBehaviorMirror";
import { GetCoachDetail } from "../GetCoachDetail";
import { GetCoachGenerationStatus } from "../GetCoachGenerationStatus";
import { GetCoachRecommendation } from "../GetCoachRecommendation";
import { GetJudgmentScoreboard } from "../GetJudgmentScoreboard";
import { GetSymbolEvents } from "../GetSymbolEvents";
import { GetSymbolForecast } from "../GetSymbolForecast";
import { GetSymbolPositioning } from "../GetSymbolPositioning";
import { GetSignalPerformance } from "../GetSignalPerformance";
import { GetSymbolCoach } from "../GetSymbolCoach";
import { ListProfitPlans } from "../ListProfitPlans";
import { GetCoachProfile, UpdateCoachProfile } from "../ManageCoachProfile";
import { ConfirmOutcomeTags, ListDecisionOutcomes } from "../ManageDecisionOutcomes";
import { GetRiskBudget, UpdateRiskBudget } from "../ManageRiskBudget";
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
  judgments: SymbolJudgmentStore;
  ledger: JudgmentLedgerStore;
  /** 저장 추천 스냅샷 원장(F010 슬라이스 0) */
  recommendations: RecommendationSnapshotStore;
  tracked: TrackedAssetProbe;
  gauges: GaugeTrackStore;
  generationLogs: CoachGenerationLogStore;
  /** 수동 재생성 쿨다운(초). **설정값**이다(`SRV-REQ-024` FR-82) — env 에서 온다 */
  regenerateCooldownSeconds: number;
  /** 가격 전망 읽기(F008) — `forecast.v_forecast_card` */
  forecasts: ForecastReader;
  /** 전망 소유자 이메일(ADR-003) — env 에서 온다. 비면 아무도 못 본다 */
  forecastOwnerEmails: readonly string[];
  /** 거래 계획(F009 슬라이스 1) — `trade_plans` */
  tradePlans: TradePlanStore;
  /** 결정 결과(F009 슬라이스 4) — `decision_outcomes` */
  decisionOutcomes: DecisionOutcomeStore;
  /** 월간 복기(F009 슬라이스 6) — `monthly_reviews` */
  monthlyReviews: MonthlyReviewStore;
}

export interface CoachUseCases {
  generateRecommendation: GenerateCoachRecommendation;
  requestGeneration: RequestCoachGeneration;
  getGenerationStatus: GetCoachGenerationStatus;
  getRecommendation: GetCoachRecommendation;
  getCoachDetail: GetCoachDetail;
  getSymbolCoach: GetSymbolCoach;
  getProfile: GetCoachProfile;
  updateProfile: UpdateCoachProfile;
  recordFeedback: RecordCoachFeedback;
  explainDecision: ExplainCoachDecision;
  analyzeNewsSentiment: AnalyzeNewsSentiment;
  analyzeTradingBehavior: AnalyzeTradingBehavior;
  getBehaviorCoach: GetBehaviorCoach;
  checkTradePreflight: CheckTradePreflight;
  listProfitPlans: ListProfitPlans;
  getSignalPerformance: GetSignalPerformance;
  getJudgmentScoreboard: GetJudgmentScoreboard;
  getSymbolForecast: GetSymbolForecast;
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
  /** F009 슬라이스 4 — 준수 판정 · 결정 결과 배치 · 미러 · 태그 확정 */
  evaluateTradeDecisions: EvaluateTradeDecisions;
  getBehaviorMirror: GetBehaviorMirror;
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
    deps.gauges
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
    deps.recommendations
  );

  const getRiskBudget = new GetRiskBudget(deps.profiles, deps.portfolio, deps.market, deps.forecasts);
  const buildMonthlyReview = new BuildMonthlyReview(
    deps.monthlyReviews,
    deps.profiles,
    deps.portfolio,
    deps.tradePlans,
    deps.decisionOutcomes,
    deps.forecasts
  );

  const useCases: CoachUseCases = {
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
      analyzeTradingBehavior
    ),
    getSymbolCoach: symbolCoach,
    getProfile: new GetCoachProfile(deps.profiles),
    updateProfile: new UpdateCoachProfile(deps.profiles),
    recordFeedback: new RecordCoachFeedback(deps.insights),
    explainDecision: new ExplainCoachDecision(
      deps.explainer,
      deps.market,
      deps.portfolio,
      deps.judgments,
      deps.news
    ),
    analyzeNewsSentiment,
    analyzeTradingBehavior,
    getBehaviorCoach: new GetBehaviorCoach(deps.portfolio, analyzeTradingBehavior),
    checkTradePreflight: new CheckTradePreflight(
      deps.market,
      deps.portfolio,
      deps.profiles
    ),
    listProfitPlans: new ListProfitPlans(deps.portfolio),
    getSignalPerformance: new GetSignalPerformance(deps.recommendations),
    getJudgmentScoreboard: new GetJudgmentScoreboard(deps.judgments),
    getSymbolForecast: new GetSymbolForecast(deps.forecasts, deps.portfolio, deps.forecastOwnerEmails),
    getSymbolEvents: new GetSymbolEvents(deps.forecasts, deps.forecastOwnerEmails),
    getSymbolPositioning: new GetSymbolPositioning(deps.forecasts, deps.forecastOwnerEmails),
    snapshotSymbolJudgments: new SnapshotSymbolJudgments(
      deps.tracked,
      deps.market,
      deps.judgments
    ),
    publishJudgmentLedger: new PublishJudgmentLedger(deps.tracked, deps.market, deps.ledger),
    evaluateSymbolJudgments: new EvaluateSymbolJudgments(
      deps.market,
      deps.judgments
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
      new PreviewTradeBehavior(deps.portfolio, deps.tradePlans, deps.decisionOutcomes, deps.market)
    ),
    createTradePlan: new CreateTradePlan(deps.tradePlans, deps.portfolio),
    updateTradePlan: new UpdateTradePlan(deps.tradePlans, deps.portfolio),
    listTradePlans: new ListTradePlans(deps.tradePlans),
    getRiskBudget,
    updateRiskBudget: new UpdateRiskBudget(deps.profiles, getRiskBudget),
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
    listDecisionOutcomes: new ListDecisionOutcomes(deps.decisionOutcomes),
    confirmOutcomeTags: new ConfirmOutcomeTags(deps.decisionOutcomes),
    buildMonthlyReview,
    getMonthlyReview: new GetMonthlyReview(deps.monthlyReviews, buildMonthlyReview),
  };

  return { useCases };
};

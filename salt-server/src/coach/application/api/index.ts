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
  SymbolJudgmentStore,
  ForecastReader,
  TrackedAssetProbe,
} from "../../domain";
import { AnalyzeNewsSentiment } from "../AnalyzeNewsSentiment";
import {
  AnalyzeTradingBehavior,
  GetBehaviorCoach,
} from "../AnalyzeTradingBehavior";
import { CheckTradePreflight } from "../CheckTradePreflight";
import { ExplainCoachDecision } from "../ExplainCoachDecision";
import { GenerateCoachRecommendation } from "../GenerateCoachRecommendation";
import { GetCoachDetail } from "../GetCoachDetail";
import { GetCoachGenerationStatus } from "../GetCoachGenerationStatus";
import { GetCoachRecommendation } from "../GetCoachRecommendation";
import { GetJudgmentScoreboard } from "../GetJudgmentScoreboard";
import { GetSymbolEvents } from "../GetSymbolEvents";
import { GetSymbolForecast } from "../GetSymbolForecast";
import { GetSignalPerformance } from "../GetSignalPerformance";
import { GetSymbolCoach } from "../GetSymbolCoach";
import { ListProfitPlans } from "../ListProfitPlans";
import { GetCoachProfile, UpdateCoachProfile } from "../ManageCoachProfile";
import { RecordCoachFeedback } from "../RecordCoachFeedback";
import {
  EvaluateSymbolJudgments,
  SnapshotSymbolJudgments,
} from "../RecordSymbolJudgments";
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
  tracked: TrackedAssetProbe;
  gauges: GaugeTrackStore;
  generationLogs: CoachGenerationLogStore;
  /** 수동 재생성 쿨다운(초). **설정값**이다(`SRV-REQ-024` FR-82) — env 에서 온다 */
  regenerateCooldownSeconds: number;
  /** 가격 전망 읽기(F008) — `forecast.v_forecast_card` */
  forecasts: ForecastReader;
  /** 전망 소유자 이메일(ADR-003) — env 에서 온다. 비면 아무도 못 본다 */
  forecastOwnerEmails: readonly string[];
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
  snapshotSymbolJudgments: SnapshotSymbolJudgments;
  evaluateSymbolJudgments: EvaluateSymbolJudgments;
  refreshGaugeTrackRecords: RefreshGaugeTrackRecords;
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
    deps.insights,
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
    deps.generationLogs
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
      deps.portfolio
    ),
    getSymbolCoach: symbolCoach,
    getProfile: new GetCoachProfile(deps.profiles),
    updateProfile: new UpdateCoachProfile(deps.profiles),
    recordFeedback: new RecordCoachFeedback(deps.insights),
    explainDecision: new ExplainCoachDecision(
      deps.explainer,
      deps.market,
      deps.portfolio,
      deps.judgments
    ),
    analyzeNewsSentiment,
    analyzeTradingBehavior,
    getBehaviorCoach: new GetBehaviorCoach(
      deps.insights,
      deps.portfolio,
      analyzeTradingBehavior
    ),
    checkTradePreflight: new CheckTradePreflight(
      deps.market,
      deps.portfolio,
      deps.profiles
    ),
    listProfitPlans: new ListProfitPlans(deps.portfolio),
    getSignalPerformance: new GetSignalPerformance(deps.insights, deps.market),
    getJudgmentScoreboard: new GetJudgmentScoreboard(deps.judgments),
    getSymbolForecast: new GetSymbolForecast(deps.forecasts, deps.portfolio, deps.forecastOwnerEmails),
    getSymbolEvents: new GetSymbolEvents(deps.forecasts, deps.forecastOwnerEmails),
    snapshotSymbolJudgments: new SnapshotSymbolJudgments(
      deps.tracked,
      deps.market,
      deps.judgments
    ),
    evaluateSymbolJudgments: new EvaluateSymbolJudgments(
      deps.market,
      deps.judgments
    ),
    refreshGaugeTrackRecords: new RefreshGaugeTrackRecords(
      deps.market,
      deps.gauges
    ),
  };

  return { useCases };
};

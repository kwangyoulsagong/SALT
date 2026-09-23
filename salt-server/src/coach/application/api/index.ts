import type {
  CoachExplainer,
  CoachInsightStore,
  CoachNotifier,
  CoachProfileStore,
  GaugeTrackStore,
  MarketProbe,
  NewsProbe,
  PortfolioProbe,
  SymbolJudgmentStore,
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
import { GetCoachRecommendation } from "../GetCoachRecommendation";
import { GetJudgmentScoreboard } from "../GetJudgmentScoreboard";
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
}

export interface CoachUseCases {
  generateRecommendation: GenerateCoachRecommendation;
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

  const useCases: CoachUseCases = {
    generateRecommendation: new GenerateCoachRecommendation(
      deps.profiles,
      deps.insights,
      deps.market,
      deps.portfolio,
      deps.notifier,
      analyzeNewsSentiment,
      symbolCoach
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

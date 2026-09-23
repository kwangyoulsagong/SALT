import {
  calculateConfidence,
  calculateSeverity,
  explainRecommendation,
  rankCandidates,
  generateCandidates,
  type Clock,
  type CoachGenerationLogStore,
  type CoachGenerationSource,
  type CoachInsight,
  type CoachInsightStore,
  type CoachMode,
  type CoachNotifier,
  type CoachProfileStore,
  type MarketProbe,
  type PortfolioProbe,
} from "../domain";
import { isDomainError } from "../../shared/domain";
import { AnalyzeNewsSentiment } from "./AnalyzeNewsSentiment";
import { GetSymbolCoach, type SymbolCoachView } from "./GetSymbolCoach";
import { assembleCoachContext } from "./lib/assembleCoachContext";

/** 판단 1건의 유효 시간. 원문 그대로 2시간이다. */
const RECOMMENDATION_TTL_MS = 2 * 60 * 60 * 1000;
/** 같은 통보를 이 시간 안에 두 번 보내지 않는다. */
const NOTICE_SUPPRESSION_MS = 2 * 60 * 60 * 1000;
/** 사용자당 하나만 유지하는 판단의 키. */
const MAIN_COACH_KEY = "main_coach";

export interface GenerateCoachCommand {
  symbol?: string;
  mode?: CoachMode;
}

export interface GenerateCoachOptions {
  /** 누가 불렀나. 워커가 기본이다 — 수동 요청은 `RequestCoachGeneration` 을 거친다 */
  source?: CoachGenerationSource;
  /** 이미 `start` 한 기록. 수동 요청은 받는 순간 기록을 만들고 그 id 를 넘긴다 */
  logId?: string;
}

type Generated = CoachInsight | SymbolCoachView | null;

/**
 * 코치 추천 생성 — `ai-investment-coach.service.generateCoach` 에서 옮겨왔다.
 *
 * ## 순서가 곧 이 유스케이스의 내용이다
 *
 * 1. 뉴스 감성을 매기고 2. 재료를 모아 3. 후보를 만들고 4. 점수를 매겨 5. 근거를
 * 조립해 6. 저장하고 7. 판단이 바뀌었으면 알린다.
 * **2~5 는 전부 `domain` 이 한다** — 이 클래스에 산술이 없다(`ddd-application.md` §2).
 *
 * 보유가 없으면 종목 단위 판단으로 넘어간다. 원문과 같은 대체 경로다.
 *
 * ## 생성마다 기록을 남긴다 (`DB-REQ-017` FR-13 · 14 · `SRV-REQ-024` FR-84)
 *
 * 워커 · 수동 모두 `coach_generation_logs` 에 시작과 끝을 남긴다. 실패도 남기고 **다시 던진다** —
 * 워커의 부분 실패 집계(`forEachUser`)가 그대로 동작해야 한다. 기록 자체가 실패하면 생성은
 * 계속한다 — 관측이 본 기능을 막으면 안 된다.
 *
 * `llmSource` 는 지금 늘 `rule` 이다 — 저장 추천 요약은 규칙 문장이고 LLM 을 부르지 않는다.
 *
 * ## 트랜잭션을 열지 않는다
 *
 * 쓰기가 **인사이트 1행 + 알림 0~1행**이고 둘은 독립이다. 알림이 실패해도 판단은
 * 남아야 하며(다음 회차가 다시 비교한다) 판단이 실패하면 알릴 것이 없다.
 * 묶으면 얻는 것 없이 트랜잭션이 외부 조회 시간만큼 길어진다.
 */
export class GenerateCoachRecommendation {
  constructor(
    private readonly profiles: CoachProfileStore,
    private readonly insights: CoachInsightStore,
    private readonly market: MarketProbe,
    private readonly portfolio: PortfolioProbe,
    private readonly notifier: CoachNotifier,
    private readonly analyzeNews: AnalyzeNewsSentiment,
    private readonly symbolCoach: GetSymbolCoach,
    private readonly logs: CoachGenerationLogStore,
    private readonly clock: Clock = () => new Date()
  ) {}

  async execute(
    userId: string,
    command: GenerateCoachCommand = {},
    options: GenerateCoachOptions = {}
  ): Promise<Generated> {
    const startedAt = this.clock();
    const logId =
      options.logId ??
      (await this.logs
        .start(userId, options.source ?? "worker", startedAt)
        .catch(() => null));

    const finish = (status: "succeeded" | "failed", errorCode: string | null) =>
      logId
        ? this.logs
            .finish(logId, {
              status,
              llmSource: status === "succeeded" ? "rule" : null,
              durationMs: this.clock().getTime() - startedAt.getTime(),
              errorCode,
            })
            .catch(() => undefined)
        : undefined;

    try {
      const result = await this.generate(userId, command);
      await finish("succeeded", null);
      return result;
    } catch (error) {
      await finish("failed", errorCodeOf(error));
      throw error;
    }
  }

  private async generate(
    userId: string,
    command: GenerateCoachCommand
  ): Promise<Generated> {
    const newsAnalysisMap = await this.analyzeNews.execute();

    const ctx = await assembleCoachContext(
      {
        profiles: this.profiles,
        insights: this.insights,
        market: this.market,
        portfolio: this.portfolio,
      },
      userId,
      newsAnalysisMap
    );

    if (!ctx) {
      return this.symbolCoach.execute(userId, {
        symbol: command.symbol?.toUpperCase() ?? "BTC",
        mode: command.mode,
      });
    }

    const ranked = rankCandidates(ctx, generateCandidates(ctx));
    if (!ranked.length) return null;

    const [top, second] = ranked;
    const { summary, payload } = explainRecommendation(ctx, top, ranked);

    const selectedSymbol = command.symbol?.toUpperCase() ?? top.symbol;
    const selectedMode: CoachMode = command.mode ?? "long_term";

    const [symbolCoach, previous] = await Promise.all([
      this.symbolCoach.execute(userId, {
        symbol: selectedSymbol,
        mode: selectedMode,
      }),
      this.insights.findRecommendationByKey(userId, MAIN_COACH_KEY),
    ]);

    const extendedPayload = {
      ...payload,
      mode: selectedMode,
      symbol: selectedSymbol,
      decision: symbolCoach.modeDecision,
      dualDecision: symbolCoach.dualDecision,
      missingData: symbolCoach.missingData,
      dataFreshness: symbolCoach.dataFreshness,
      generatedAt: new Date().toISOString(),
    };

    const insight = await this.insights.saveRecommendation({
      userId,
      title: "AI 투자 코치",
      summary,
      severity: calculateSeverity(top.score, ctx.portfolioState.riskLevel),
      confidence: calculateConfidence(top.score, second?.score ?? 0),
      dedupeKey: MAIN_COACH_KEY,
      payload: extendedPayload,
      expiresAt: new Date(Date.now() + RECOMMENDATION_TTL_MS),
    });

    await this.notifyDecisionChange({
      userId,
      symbol: selectedSymbol,
      mode: selectedMode,
      previousAction: readDecisionAction(previous),
      nextAction: symbolCoach.modeDecision.action,
    });

    return insight;
  }

  /**
   * 판단이 **바뀐 경우에만** 알린다.
   *
   * 10분마다 도는 워커가 같은 판단을 반복하므로, 값이 같으면 알리지 않는 것이
   * 알림의 의미를 지킨다. 2시간 억제는 그 위의 이중 안전장치다.
   */
  private async notifyDecisionChange(input: {
    userId: string;
    symbol: string;
    mode: CoachMode;
    previousAction: string | null;
    nextAction: string;
  }): Promise<void> {
    if (!input.previousAction || input.previousAction === input.nextAction) {
      return;
    }

    const suppressed = await this.notifier.hasRecentDecisionChange(
      input.userId,
      input.symbol,
      new Date(Date.now() - NOTICE_SUPPRESSION_MS)
    );
    if (suppressed) return;

    await this.notifier.publishDecisionChange({
      userId: input.userId,
      symbol: input.symbol,
      mode: input.mode,
      previousAction: input.previousAction,
      nextAction: input.nextAction,
    });
  }
}

/** 기록용 오류 코드. 메시지는 남기지 않는다 — 외부 응답 원문이 섞일 수 있다. */
const errorCodeOf = (error: unknown): string =>
  isDomainError(error)
    ? error.code
    : error instanceof Error
      ? error.name
      : "unknown";

/** 직전 판단의 행동. 없으면 `null` — 첫 생성에는 비교 대상이 없다. */
const readDecisionAction = (insight: CoachInsight | null): string | null => {
  const decision = insight?.payload?.decision as
    | { action?: string }
    | undefined;
  return decision?.action ?? null;
};

import type {
  JudgmentCase,
  JudgmentOutcome,
  JudgmentTrackStats,
  ModeDecisionAction,
} from "./policy";
import type {
  CoachArticle,
  CoachAssetType,
  CoachHolding,
  CoachIndicator,
  CoachInsight,
  CoachMode,
  CoachProfile,
  CoachQuote,
  CoachSentiment,
  CoachTrade,
  CoachWhaleTransaction,
} from "./model";

/**
 * `coach` 가 밖에 요구하는 것. 선언은 `domain` 이 하고 `infrastructure` 가 구현한다.
 *
 * ## 세 Probe 가 곧 이 컨텍스트의 경계다
 *
 * 원문의 `ai-coach-feature.extractor` · `trade-preflight` · `profit-plan` ·
 * `behavior-analysis` · `signal-performance` 는 **각자 `prisma` 로 남의 테이블
 * (`portfolioHolding` · `technicalIndicator` · `marketAsset` · `priceHistory` ·
 * `newsArticle`)을 직접 뒤졌다.** 그 조회가 여기 Port 세 개(`MarketProbe` ·
 * `PortfolioProbe` · `NewsProbe`)로 모였고, 구현은 `infrastructure` 의 ACL 이
 * 남의 **공개 API** 를 우리 말로 옮긴 것이다 (`ddd-infrastructure.md` §5).
 *
 * `InvestmentInsight` · `UserInvestmentProfile` · `InvestmentNotification` 세 테이블만
 * Prisma 로 직접 읽고 쓴다 — 그 셋의 이관 상태는 `infrastructure` 의 각 구현 주석에 있다.
 */

/** 코치 설정 저장. 원문의 `userInvestmentProfile` 이다. */
export interface CoachProfileStore {
  findByUser(userId: string): Promise<CoachProfile | null>;
  /** 없으면 만들고 있으면 준 값만 덮는다. 원문이 `upsert` 였다. */
  upsert(
    userId: string,
    patch: Partial<Omit<CoachProfile, "userId">>
  ): Promise<CoachProfile>;
}

export interface CoachInsightDraft {
  userId: string;
  symbol?: string | null;
  title: string;
  summary: string;
  severity: number;
  confidence: number | null;
  dedupeKey: string;
  payload: Record<string, unknown>;
  /** 이 시각 이후로는 읽지 않는다. `null` 이면 만료가 없다. */
  expiresAt: Date | null;
}

/**
 * 인사이트 저장·조회.
 *
 * **읽는 것과 쓰는 것의 주인이 다르다.** `ai_coach` · `behavior_analysis` 는 코치가
 * 쓰고, `smart_buy_zone` · `risk_alert` 는 아직 `modules/investment-insight` 의
 * 워커가 쓴다. 그래서 읽기 메서드는 타입을 인자로 받지 않고 **용도별로 이름이 있다** —
 * 무엇을 읽는지가 호출부가 아니라 이 표에 남는다.
 */
export interface CoachInsightStore {
  /** 점수 계산 재료. 사용자 것과 `global` 을 함께, 만료되지 않은 것만. */
  findActiveForScoring(userId: string, limit: number): Promise<CoachInsight[]>;
  /** 가장 최근 코치 판단 1건. */
  findLatestRecommendation(userId: string): Promise<CoachInsight | null>;
  /** `dedupeKey` 로 직전 판단 1건. 판단이 바뀌었는지 비교에 쓴다. */
  findRecommendationByKey(
    userId: string,
    dedupeKey: string
  ): Promise<CoachInsight | null>;
  saveRecommendation(draft: CoachInsightDraft): Promise<CoachInsight>;
  saveFeedback(draft: CoachInsightDraft): Promise<CoachInsight>;
  saveBehavior(draft: CoachInsightDraft): Promise<CoachInsight>;
  /** 활성 행동 분석. 행동 코치 화면이 읽는다. */
  findActiveBehavior(userId: string, limit: number): Promise<CoachInsight[]>;
  /** 성적표가 보는 과거 판단. 최신이 앞이다. */
  findRecommendationHistory(
    userId: string,
    symbol: string | undefined,
    limit: number
  ): Promise<CoachInsight[]>;
}

export interface DecisionChangeNotice {
  userId: string;
  symbol: string;
  mode: CoachMode;
  previousAction: string;
  nextAction: string;
}

/**
 * 판단 변화 통보.
 *
 * > `notification` 컨텍스트가 아직 없다(`SRV-REQ-006` FR-33). 그때 이 Port 의 구현이
 * > **Domain Event 발행**으로 바뀐다 — 지금 이벤트로 내면 받을 쪽이 없다.
 */
export interface CoachNotifier {
  /** `since` 이후 같은 통보가 있었나. 원문의 2시간 중복 억제다. */
  hasRecentDecisionChange(
    userId: string,
    symbol: string,
    since: Date
  ): Promise<boolean>;
  publishDecisionChange(notice: DecisionChangeNotice): Promise<void>;
}

/**
 * `market` 조회 — ACL Port.
 *
 * 전부 **여러 심볼을 한 번에** 받는다. 원문은 심볼마다 조회를 돌리거나(`N+1`)
 * 컨텍스트 밖에서 `prisma.findMany({ distinct })` 를 직접 불렀다.
 */
export interface MarketProbe {
  latestIndicators(symbols: string[]): Promise<Map<string, CoachIndicator>>;
  latestSentiments(symbols: string[]): Promise<Map<string, CoachSentiment>>;
  quotes(symbols: string[]): Promise<Map<string, CoachQuote>>;
  recentWhales(
    symbols: string[],
    limit: number
  ): Promise<CoachWhaleTransaction[]>;
  /** `since` 이후 5분봉 최고 종가. 추격 매수 판정의 기준선이다. */
  highestCloseSince(
    symbols: string[],
    since: Date
  ): Promise<Map<string, number>>;
  /** `at` 시각 **이후 첫** 종가. 성적표의 진입가다. 없으면 `null`. */
  closeAtOrAfter(symbol: string, at: Date): Promise<number | null>;
  latestCloses(symbols: string[]): Promise<Map<string, number>>;
}

/** `portfolio` 조회 — ACL Port. */
export interface PortfolioProbe {
  /**
   * 보유 전체. `assetType` 을 주면 그 자산군만.
   *
   * **주문 전 계산과 익절 계획은 `crypto` 만 본다** — 원문이 그랬고, 비중 한도와
   * 손절 가격이 다른 자산군과 섞이면 계산의 뜻이 달라진다. 점수·집중도는 반대로
   * 전부 본다(포트폴리오 전체의 쏠림을 보는 것이 목적이다).
   */
  listHoldings(
    userId: string,
    assetType?: CoachAssetType
  ): Promise<CoachHolding[]>;
  getHolding(userId: string, symbol: string): Promise<CoachHolding | null>;
  /** `since` 이후 거래. 행동 분석이 본다. */
  listTradesSince(
    userId: string,
    since: Date,
    limit: number
  ): Promise<CoachTrade[]>;
  /**
   * 거래 건수.
   *
   * 행동 코치의 최소 표본(3건) 판정에만 쓴다. 원문은 거래 행 전체를 읽어 세었다
   * (`ddd-infrastructure.md` §3 — 목록으로 집계하지 않는다).
   */
  countTrades(userId: string): Promise<number>;
}

export interface CoachArticleQuery {
  symbol: string;
  /** 제목·요약에서 함께 찾을 말. 종목 사전은 `coach` 의 것이다. */
  keywords: string[];
  since: Date;
  limit: number;
}

/** `news` 조회 — ACL Port. */
export interface NewsProbe {
  findArticlesForSentiment(query: CoachArticleQuery): Promise<CoachArticle[]>;
}

export interface CoachExplanationInput {
  symbol: string;
  koreanName: string;
  mode: CoachMode;
  currentPrice: number;
  change24h: number;
  tradeValue24h: number;
  evidence: Array<{ label: string; value: string }>;
  news?: Array<{
    title: string;
    summary?: string;
    source?: string;
    sentiment?: string;
  }>;
}

/**
 * 해설 결과.
 *
 * ## `expectedReturn` 을 뺐다 (2026-09-18)
 *
 * 원문은 모델에게 **예상 수익률 범위**(`lowPercent`·`highPercent`)를 받아 응답에 실었다.
 * 전 영역 공통 수용 기준 4 는 "확신 표현과 목표주가·수익률 예측이 **0건**"이고, 범위로
 * 적어도 예측은 예측이다. 타협 대상이 아니라 타입에서 없앴다 —
 * **필드가 없으면 프롬프트도 소비처도 생길 수 없다.**
 *
 * 대신 `timeframe` 을 남긴다. "언제까지 보는 관점인가"는 예측이 아니라 판단의 전제다.
 */
export interface CoachExplanation {
  modeReasoning: string;
  /** 이 해설이 전제한 관찰 기간. 수익률이 아니라 기간만 말한다. */
  timeframe: string;
  keyDrivers: string[];
  risks: string[];
  newsSummary: string[];
  disclaimer: string;
  generatedAt: string;
  cached: boolean;
}

/**
 * 문장 생성 Port (LLM).
 *
 * **숫자는 우리가 주입하고 문장만 받는다** (`ddd-infrastructure.md` §6).
 * 호출이 수 초~수십 초라 **트랜잭션 밖에서만** 부른다 (`ddd-application.md` §3).
 */
export interface CoachExplainer {
  explain(input: CoachExplanationInput): Promise<CoachExplanation>;
}

export interface JudgmentSnapshotDraft {
  symbol: string;
  mode: CoachMode;
  action: ModeDecisionAction;
  signalType: string;
  score: number;
  reasons: string[];
  entryPrice: number;
  judgedAt: Date;
}

export interface PendingJudgment {
  id: string;
  symbol: string;
  mode: CoachMode;
  action: ModeDecisionAction;
  entryPrice: number;
  judgedAt: Date;
}

export interface JudgmentEvaluation {
  id: string;
  exitPrice: number;
  returnRate: number;
  outcome: JudgmentOutcome;
  evaluatedAt: Date;
}

/**
 * 종목 판단 스냅샷 (F004 · D11).
 *
 * 성적은 **저장소가 SQL 로 모아 준다**(`summarize`). 표본 행을 전부 읽어 세지 않는다 —
 * 단타는 종목당 하루 1행씩 쌓인다(`ddd-infrastructure.md` §3).
 */
export interface SymbolJudgmentStore {
  /** 종목 · 모드별 마지막 판단 시각. 없는 조합은 맵에 없다. */
  lastJudgedAt(symbols: string[]): Promise<Map<string, Date>>;
  /** 같은 `(symbol, mode, judgedAt)` 가 있으면 건너뛴다 — 워커가 겹쳐 돌아도 한 벌이다. */
  saveSnapshots(drafts: JudgmentSnapshotDraft[]): Promise<number>;
  /**
   * 관찰 기간이 끝났고 아직 판정이 없는 것. 오래된 것이 앞이다.
   * `judgedBefore` 는 모드별이다 — 만기가 안 된 장기 스냅샷이 배치 자리를 차지하지 않게.
   */
  listPending(
    judgedBefore: Record<CoachMode, Date>,
    limit: number
  ): Promise<PendingJudgment[]>;
  saveEvaluations(evaluations: JudgmentEvaluation[]): Promise<void>;
  summarize(signalType: string): Promise<JudgmentTrackStats>;
  /** 최근 사례. 적중과 실패를 **같은 함수 · 같은 상한**으로 뽑는다(B2). */
  recentCases(
    signalType: string,
    outcome: JudgmentOutcome,
    limit: number
  ): Promise<JudgmentCase[]>;
}

/**
 * 추적 자산 — 관심 종목 ∪ 보유 (감사 문서 D8 · B25).
 *
 * 사용자 구분 없이 **심볼만** 돌려준다. 판단이 사용자와 무관해서 스냅샷도 종목당 한 벌이다.
 */
export interface TrackedAssetProbe {
  listTrackedSymbols(): Promise<string[]>;
}

/** 지금 시각. 테스트가 시계를 고정할 수 있게 Port 로 둔다. */
export type Clock = () => Date;

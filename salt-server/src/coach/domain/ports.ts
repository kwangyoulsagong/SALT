import type Decimal from "decimal.js";

import type {
  BehaviorFinding,
  CloseDistribution,
  CoachGenerationEntry,
  CoachGenerationSource,
  EventCardRow,
  PositioningRow,
  SignalReactionRow,
  ForecastCardRow,
  GaugeKind,
  GaugeTrackStats,
  JudgmentCase,
  JudgmentGroupStats,
  JudgmentOutcome,
  JudgmentStance,
  JudgmentTrackStats,
  ModeDecisionAction,
  TradePlan,
  TradePlanDraft,
  TradePlanPatch,
  ZoneTimeframe,
  IndicatorTimeframe,
  RecommendationCase,
  AdherenceLabel,
  DailyBar,
  DecisionOutcome,
  DecisionOutcomeDraft,
  MonthlyReview,
  JudgmentLedgerDraft,
  TargetWeightLiveRecord,
  LlmUsage,
} from "./policy";
import type {
  CoachAction,
  CoachArticle,
  CoachAssetType,
  CoachHolding,
  CoachIndicator,
  CoachInsight,
  CoachLedgerEntry,
  CoachMode,
  CoachProfile,
  CoachQuote,
  CoachSymbolArticle,
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
 * 행동 판정(과매매 · 패닉 · 추격) — `AnalyzeTradingBehavior` 가 이 모양이다.
 * **저장하지 않고** 요청 때 센다(FEATURE-009 FR-21 — 알림이 아니라 측정).
 */
export interface BehaviorAnalyzer {
  execute(userId: string, now?: Date): Promise<BehaviorFinding[]>;
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
  /** 여러 심볼의 최신 지표 — **주기 필수**(`COACH_INDICATOR_TIMEFRAME`). 주기 없는 "최신"은 호출마다 다른 봉의 RSI 를 준다. */
  latestIndicators(
    symbols: string[],
    timeframe: IndicatorTimeframe
  ): Promise<Map<string, CoachIndicator>>;
  latestSentiments(symbols: string[]): Promise<Map<string, CoachSentiment>>;
  quotes(symbols: string[]): Promise<Map<string, CoachQuote>>;
  recentWhales(
    symbols: string[],
    limit: number
  ): Promise<CoachWhaleTransaction[]>;
  /**
   * `[from, to]` 5분봉 최고 종가 — 결과 태그의 추격 판정(F009 FR-18). 5분봉은 30일만 남는다 —
   * 그보다 오래됐으면 `null`(모름)이다. 0 이 아니다
   */
  highestCloseBetween(symbol: string, from: Date, to: Date): Promise<number | null>;
  /** `since` 이후 5분봉 최고 종가. 추격 매수 판정의 기준선이다. */
  highestCloseSince(
    symbols: string[],
    since: Date
  ): Promise<Map<string, number>>;
  /** `at` 시각 **이후 첫** 종가 — **주기 필수**(`JUDGMENT_PRICE_TIMEFRAME`). 성적표의 기준가다. 없으면 `null`. */
  closeAtOrAfter(symbol: string, at: Date, timeframe: ZoneTimeframe): Promise<number | null>;
  /**
   * `at` **이전(포함) 마지막** 종가와 그 봉 시각. `notBefore` 보다 오래된 봉은 없는 것 — 국내 주식 채점(F011 FR-64,
   * 만기일이 휴장이면 직전 거래일 종가). 없으면 `null`
   */
  closeAtOrBefore(
    symbol: string,
    at: Date,
    timeframe: ZoneTimeframe,
    notBefore: Date
  ): Promise<{ close: number; timestamp: Date } | null>;
  /** 심볼별 일봉 수 — 국내 주식 판단 해제 조건(일봉 120 거래일, F011 FR-62). 없는 심볼은 빠진다 */
  dailyBarCounts(symbols: string[]): Promise<Map<string, number>>;
  latestCloses(symbols: string[]): Promise<Map<string, number>>;
  /**
   * 심리 구간별 30일 뒤 수익률 분포 — 게이지 적중률(B9)의 재료. `market` 이 집계한다.
   * `bucketIndex` 는 `floor(score / bucketWidth)` 이고 코드로 바꾸는 것은 우리 몫이다.
   */
  sentimentForwardReturns(query: {
    bucketWidth: number;
    horizonDays: number;
    since: Date;
  }): Promise<GaugeForwardReturn[]>;
  /** `since` 이후 종가 백분위 — 관찰 구간(D2)의 재료. DB 가 계산한다. */
  closePercentiles(
    symbol: string,
    timeframe: ZoneTimeframe,
    since: Date,
    fractions: number[]
  ): Promise<CloseDistribution>;
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
  /** 한 종목 보유. 자산군을 안 주면 코인 — 국내 주식 종목 판단은 `kr_stock` 을 준다(F011 슬라이스 4) */
  getHolding(userId: string, symbol: string, assetType?: CoachAssetType): Promise<CoachHolding | null>;
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
  /**
   * `since` 이후 거래 — 금액 계산용(월 손익 · 회전율). 기본은 코인만, 리스크 예산 · 사이즈는 코인 + 국내 주식
   * (`assetTypes`, F011 슬라이스 4 — 둘 다 원화라 한 예산에 합친다).
   * `truncated` 가 참이면 `limit` 에 걸려 다 읽지 못했다 — 합을 만들면 거짓이 된다
   */
  listLedgerSince(
    userId: string,
    since: Date,
    limit: number,
    assetTypes?: readonly CoachAssetType[]
  ): Promise<{ entries: CoachLedgerEntry[]; truncated: boolean }>;
  /** 거래 한 건(코인 · 국내 주식). 남의 것이면 `null` — 계획 연결 검사용 */
  findLedgerEntry(userId: string, transactionId: string): Promise<CoachLedgerEntry | null>;
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
  /** 종목 최신 뉴스 — 해설 사실(C01). 화면의 종목 뉴스와 같은 조회다 */
  recentForSymbol(symbol: string, limit: number): Promise<CoachSymbolArticle[]>;
}

export interface CoachExplanationInput {
  symbol: string;
  koreanName: string;
  mode: CoachMode;
  currentPrice: number;
  change24h: number;
  tradeValue24h: number;
  evidence: Array<{ label: string; value: string }>;
  /**
   * 판단 방향 — 해설 검증기가 문장 극성을 대조한다(F010 슬라이스 6 · `SRV-REQ-025` FR-61).
   * 프롬프트에는 싣지 않는다 — 모델은 "판단" 근거 문장을 이미 본다. 없으면 극성 대조를 건너뛴다
   */
  stance?: JudgmentStance;
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
  /**
   * `signal` — 요청한 화면이 떠나면 끊는다. 안 끊으면 아무도 안 읽을 LLM 호출이
   * 20초 × 재시도까지 끝까지 돈다(`streaming-sse.md` §4 와 같은 이유).
   *
   * `caller` — 누구의 요청인가. 구현은 **시도마다** `LlmUsageStore` 에 남긴다(재시도도 과금된다).
   */
  explain(
    input: CoachExplanationInput,
    signal?: AbortSignal,
    caller?: { userId: string }
  ): Promise<CoachExplanation>;
}

/** LLM 시도 한 건 — 프롬프트 · 응답 원문은 담지 않는다(`ddd-infrastructure.md` §6). */
export interface LlmCallRecord {
  userId: string | null;
  /** 어느 기능의 호출인가 — 지금은 `coach_explain` 하나 */
  purpose: "coach_explain";
  model: string;
  requestedAt: Date;
  durationMs: number;
  ok: boolean;
  /** 실패 분류(`timeout` · `http_429` · `schema_mismatch` …). 오류 본문이 아니다 */
  errorCode: string | null;
  promptTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

/**
 * LLM 사용량 원장(F010 슬라이스 7) — 비용 상한(`llmBudgetVerdict`)의 근거.
 * 캐시 적중은 호출이 아니라 남기지 않는다.
 */
export interface LlmUsageStore {
  record(entry: LlmCallRecord): Promise<void>;
  /** `since` 뒤 시도 수 · 토큰 합 — 전체와 사용자 한 명 */
  usageSince(since: Date, userId: string): Promise<{ user: LlmUsage; total: LlmUsage }>;
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
  /** 판단을 낸 규칙(`MODE_DECISION_RULE_VERSION`). 성적표는 현재 버전만 센다. */
  ruleVersion: string;
}

export interface PendingJudgment {
  id: string;
  symbol: string;
  /** 그룹 키 — 자산군 접두로 채점 방식이 갈린다(F011 FR-64) */
  signalType: string;
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

export interface RecommendationSnapshotDraft {
  userId: string;
  symbol: string;
  action: CoachAction;
  signalType: string;
  score: number;
  reasons: string[];
  entryPrice: number;
  judgedAt: Date;
}

export interface PendingRecommendation {
  id: string;
  symbol: string;
  action: CoachAction;
  entryPrice: number;
  judgedAt: Date;
}

/** 성적을 자르는 조건. 둘 다 없으면 이 사용자의 추천 전체다. */
export interface RecommendationFilter {
  signalType?: string;
  symbol?: string;
}

/**
 * 저장 추천 스냅샷 (F010 슬라이스 0). 종목 판단 스냅샷과 같은 모양이고 **사용자 것**이라는 점만 다르다.
 * 성적은 저장소가 SQL 로 모아 준다 — 실측은 `live` 만 센다(`SampleOrigin`).
 */
export interface RecommendationSnapshotStore {
  /** 사용자의 종목 · 행동별 마지막 추천 시각. 키는 `${symbol}:${action}`. */
  lastJudgedAt(userId: string): Promise<Map<string, Date>>;
  /** 같은 `(userId, symbol, action, judgedAt)` 가 있으면 건너뛴다. 썼으면 `true`. */
  saveSnapshot(draft: RecommendationSnapshotDraft): Promise<boolean>;
  /** 관찰 기간이 끝났고 아직 판정이 없는 것. 오래된 것이 앞이다. 사용자 무관(배치). */
  listPending(judgedBefore: Date, limit: number): Promise<PendingRecommendation[]>;
  saveEvaluations(evaluations: JudgmentEvaluation[]): Promise<void>;
  summarize(userId: string, filter: RecommendationFilter): Promise<JudgmentTrackStats>;
  /** 판정이 끝난 최근 사례. `outcome` 을 주면 그 결과만. 최신이 앞이다. */
  recentCases(
    userId: string,
    filter: RecommendationFilter,
    outcome: JudgmentOutcome | null,
    limit: number
  ): Promise<RecommendationCase[]>;
}

/**
 * 예측 원장 (F010 슬라이스 1 · `DB-REQ-017` FR-62). 매일 · 불변 — 쓰기만 있다. 읽는 쪽은 `salt-forecast` 다.
 */
export interface JudgmentLedgerStore {
  /** 그날 이미 발행한 `symbol:mode`. 같은 날 두 번째 회차가 재료를 다시 모으지 않게 한다. */
  publishedOn(asOfDate: Date): Promise<Set<string>>;
  /** 같은 `(symbol, mode, asOfDate)` 는 건너뛴다. 반환: 새로 쓴 행 수. */
  saveEntries(drafts: JudgmentLedgerDraft[]): Promise<number>;
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
  /**
   * 성적표 — **판정이 끝난 표본 전체를 신호 유형별로** 모은다(`SRV-REQ-024` FR-30 · FR-160).
   *
   * 구간별 표본 수와 사분위수까지 저장소가 센다. 그룹 수가 최대 8개(모드 2 × 판단 4)라
   * 행을 읽어 세도 되겠지만, 표본은 종목 × 기간으로 계속 늘어난다 — 집계를 여기 두면
   * 응답 시간이 표본 수와 무관해진다(`SRV-REQ-027` FR-5).
   */
  scoreboard(): Promise<JudgmentGroupStats[]>;
  /**
   * 그룹마다 최근 적중 · 실패 사례. **한 번에 다 받는다** — 그룹별로 `recentCases` 를
   * 두 번씩 부르면 쿼리가 그룹 수 × 2 가 된다(FR-36).
   */
  recentCasesByGroup(
    limit: number
  ): Promise<Map<string, Record<JudgmentOutcome, JudgmentCase[]>>>;
}

/**
 * 추적 자산 — 관심 종목 ∪ 보유 (감사 문서 D8 · B25).
 *
 * 사용자 구분 없이 **심볼만** 돌려준다. 판단이 사용자와 무관해서 스냅샷도 종목당 한 벌이다.
 */
export interface TrackedAssetProbe {
  listTrackedSymbols(): Promise<string[]>;
}

export interface GaugeForwardReturn {
  symbol: string;
  bucketIndex: number;
  sample: number;
  p25: number;
  median: number;
  p75: number;
  positiveRate: number;
  windowFrom: Date;
  windowTo: Date;
}

/**
 * 게이지 적중률 사전 집계 (`GaugeTrackRecord` · `DB-REQ-017` FR-55).
 *
 * 화면은 `find` 한 번만 한다. 분포 계산은 일 1회 워커가 `replace` 로 통째로 다시 쓴다.
 */
export interface GaugeTrackStore {
  /**
   * 한 게이지의 집계를 이 회차 것으로 바꾼다. **이번에 없는 줄은 지운다** — 구간 폭을
   * 바꾸거나 표본이 기간 밖으로 밀려나면 옛 줄이 남지 않게(FR-57).
   */
  replace(
    gauge: GaugeKind,
    records: Omit<GaugeTrackStats, "gauge">[],
    computedAt: Date
  ): Promise<void>;
  find(
    symbol: string,
    gauge: GaugeKind,
    bucketCode: string,
    horizonDays: number
  ): Promise<GaugeTrackStats | null>;
  /**
   * 같은 종목 · 기간의 **모든 구간**을 합친 오른 비율(표본 수 가중). 구간과 무관한 기준이다 —
   * 성적 문구의 "기준 대비"(F009 FR-33). 줄이 없으면 `null`.
   */
  baselinePositiveRate(symbol: string, gauge: GaugeKind, horizonDays: number): Promise<number | null>;
}

/** 지금 시각. 테스트가 시계를 고정할 수 있게 Port 로 둔다. */
/**
 * 코치 추천 생성 기록 (`DB-REQ-017` FR-13 · 14). 쿨다운 판정과 생성 성공률 관측의 근거다.
 *
 * 생성은 비동기라 기록이 둘로 나뉜다 — 받는 순간 `start`(진행 중), 끝나면 `finish`.
 * 받는 순간 남겨야 다음 요청의 쿨다운 판정이 진행 중인 생성을 본다.
 */
export interface CoachGenerationLogStore {
  start(
    userId: string,
    source: CoachGenerationSource,
    requestedAt: Date
  ): Promise<string>;
  finish(
    id: string,
    result: {
      status: "succeeded" | "failed";
      llmSource: "llm" | "rule" | null;
      durationMs: number;
      errorCode: string | null;
    }
  ): Promise<void>;
  recordRejected(userId: string, requestedAt: Date): Promise<void>;
  /** 받아들인(거부 아닌) 마지막 **수동** 요청 시각 */
  lastAcceptedManualAt(userId: string): Promise<Date | null>;
  /** 최신순 */
  recent(userId: string, limit: number): Promise<CoachGenerationEntry[]>;
}

export type Clock = () => Date;

/**
 * 가격 전망 읽기 — `forecast.v_forecast_card` 뷰만(F008 · `salt-forecast/.claude/rules/db-contract.md` §4).
 * 쓰기 주인은 `salt-forecast`(Python)이다. 심볼은 코치 모양(`BTC`)이고 번역은 구현이 한다.
 */
export interface ForecastReader {
  cards(symbol: string): Promise<ForecastCardRow[]>;
  /** 전망이 쓴 일봉 종가(오래된 → 최근). 차트의 과거 선 — `forecast.v_daily_close` */
  recentCloses(symbol: string, days: number): Promise<{ date: string; close: number }[]>;
  /** 앞으로 35일 거시 일정 × 기간별 최신 반응 통계 — `forecast.v_event_card` (FC-REQ-005) */
  eventCards(symbol: string): Promise<EventCardRow[]>;
  /**
   * 쏠림 신호 — 종목 최신 상태 한 행(`forecast.v_market_signal`)과 신호 뒤 반응 통계(`forecast.v_signal_reaction`),
   * `FC-REQ-007`. 상태가 없으면 `row: null`
   */
  positioning(symbol: string): Promise<{ row: PositioningRow | null; reactions: SignalReactionRow[] }>;
  /**
   * 종목 실현 변동성(연율) — 사이즈 계산의 변동성 타깃(FEATURE-009 FR-5).
   * 원천은 `forecast.v_realized_vol`(`FC-REQ-006`). 막혔거나 오래됐으면 `null` — 0 이 아니다
   */
  realizedVolatility(symbol: string): Promise<RealizedVolatility | null>;
  /**
   * 여러 종목의 실현 변동성 · BTC 베타 — `forecast.v_realized_vol` 한 쿼리(F010 슬라이스 2 · `FC-REQ-010`).
   * 3일 넘게 갱신 안 된 종목은 맵에서 빠진다. 막힌 변동성 · 이력 부족 베타는 `null` — 0 이 아니다
   */
  symbolRisk(symbols: string[]): Promise<Map<string, SymbolRisk>>;
  /**
   * 실현 변동성 원천의 마지막 산출 시각(전 종목 최대 `as_of`, 나이 무관) — 행이 없으면 `null`(F010 슬라이스 7).
   * `symbolRisk` 가 비었을 때 "아직 계산 안 됨"과 "배치가 멈춤"을 가르는 데만 쓴다
   */
  volatilityAsOf(): Promise<Date | null>;
  /**
   * 시장 국면 한 행 — `forecast.v_market_regime`(BTC, `FC-REQ-010`). 없거나 3일 넘었으면 `null`.
   * 게이트 · 이벤트 축소는 salt-forecast 가 사전등록 판정대로 채운 값이다 — 서버는 다시 계산하지 않는다
   */
  marketRegime(): Promise<MarketRegimeState | null>;
  /**
   * 닫힌 일봉 종가(`openTime` ≥ `from`, 시간순) — 준수 판정 · 처분효과 · 보유 대비(F009 슬라이스 4).
   * 원천은 `forecast.v_daily_close`(업비트 일봉, UTC 00:00 = KST 09:00 경계). 여러 종목을 쿼리 한 번에
   */
  dailyCloses(symbols: string[], from: Date, to?: Date): Promise<Map<string, DailyBar[]>>;
  /**
   * core 모델 포트폴리오 라이브 성적 — `forecast.v_target_weight_live`(사전등록 `target-weight@2` [live], `FC-REQ-013`).
   * 등록 목표 하나의 최신 요약 한 행. 첫 리밸런스(2026-10-05) 전이면 `null`
   */
  targetWeightLive(target: number): Promise<TargetWeightLiveRecord | null>;
  /**
   * 업비트 거래 유의 · 주의 표시 — `forecast.v_market_warning`(F010 슬라이스 6 · `FC-REQ-014`). 종목별 최신 스냅샷 한 행.
   * 원천이 "지금 상태"만 주는 공식 API 라 salt-forecast 가 매일 스냅샷을 쌓는다. 3일 넘은 스냅샷은 맵에서 빠진다
   */
  marketWarnings(symbols: string[]): Promise<Map<string, MarketWarningState>>;
}

/**
 * 거래소 표시 한 종목. `warning` = 투자유의(판정 · 추천을 내지 않는다), `cautions` = 켜진 투자주의 종류 코드
 * (`PRICE_FLUCTUATIONS` · `TRADING_VOLUME_SOARING` · `DEPOSIT_AMOUNT_SOARING` · `GLOBAL_PRICE_DIFFERENCES` ·
 * `CONCENTRATION_OF_SMALL_ACCOUNTS`). 문구는 소비처가 코드로 고른다
 */
export interface MarketWarningState {
  warning: boolean;
  cautions: string[];
  fetchedAt: Date;
}

export interface SymbolRisk {
  /** 연율 변동성(0.52 = 52%). 막혔으면 `null` */
  annualized: number | null;
  /**
   * EWMA(λ 0.94) 연율 σ 그 자체 — QLIKE 채점 게이트(`no_skill_vs_baseline`)를 보지 않는다. 이력 부족 · 시세 끊김이면 `null`.
   * 목표 비중 안내(사전등록 `target-weight@1` [protocol] sigma)가 이 값을 쓴다 — 백테스트가 게이트 없이 EWMA 로 돌았다
   */
  ewma: number | null;
  /** 90일 일 로그수익 OLS 기울기(BTC 대비). 표본 60일 미만이면 `null` */
  btcBeta: number | null;
  asOf: Date;
}

export interface MarketRegimeState {
  asOf: Date;
  close: number;
  sma200d: number | null;
  /** BTC 종가 > 200일 이동평균. 이동평균이 없으면 `true`(게이트 없음) */
  trendOpen: boolean;
  /** 2상태 HMM 고변동 상태 확률(forward 필터 — 그날까지 관측만). 적합 전이면 `null` */
  highVolProbability: number | null;
  /** 365일 최고 종가 대비(음수 · 0) */
  drawdown365d: number | null;
  /** 채택 게이트. `null` = 사전등록 판정이 게이트를 채택하지 않았다(`regime-gate@1`) */
  gateKey: string | null;
  gateOpen: boolean;
  /** 다음 24시간 안 이벤트일에 곱할 계수. 1 = 축소 없음 */
  eventFactor: number;
  nextEventKind: string | null;
  nextEventAt: Date | null;
  preregKey: string;
}

export interface RealizedVolatility {
  /** 연율 변동성(0.52 = 52%) */
  annualized: Decimal;
  asOf: Date;
}

/**
 * 거래 계획 저장 — `trade_plans` (FEATURE-009 FR-9 · `DB-REQ-031`).
 * 모든 조회 · 수정이 `userId` 로 좁혀진다 — 남의 계획은 "없다"와 구분되지 않는다.
 */
export interface TradePlanStore {
  create(draft: TradePlanDraft): Promise<TradePlan>;
  findOwned(userId: string, planId: string): Promise<TradePlan | null>;
  /** 최신이 앞. `symbol` 이 없으면 전 종목 */
  listOwned(userId: string, query: { symbol?: string; limit: number }): Promise<TradePlan[]>;
  /**
   * `requireUnlinked` 면 거래 미연결을 **쓰기 조건**으로 건다(검사 · 쓰기 사이 경합 차단).
   * 소유 · 조건에 걸리면 `null`
   */
  update(
    userId: string,
    planId: string,
    patch: TradePlanPatch,
    guard: { requireUnlinked: boolean }
  ): Promise<TradePlan | null>;
  /** "오를 확률"을 적은 계획 전부(Brier 채점, FR-13). 오래된 것이 앞 */
  listForecasted(userId: string, limit: number): Promise<TradePlan[]>;
  /** 거래에 연결된 계획 전부(판정 배치 · 미러). 오래된 것이 앞 */
  listLinked(userId: string, limit: number): Promise<TradePlan[]>;
  /** 배치의 원본 판정을 쓴다. 사용자 수정(`userAdherenceLabel`)은 건드리지 않는다 */
  saveAdherence(
    userId: string,
    judgements: Array<{ planId: string; label: AdherenceLabel | null }>,
    evaluatedAt: Date
  ): Promise<void>;
}

/**
 * 결정 결과 저장 — `decision_outcomes` (FEATURE-009 FR-14 · FR-18 · `DB-REQ-031`).
 * 모든 조회 · 수정이 `userId` 로 좁혀진다.
 */
export interface DecisionOutcomeStore {
  /**
   * 사용자 결과를 이 회차 것으로 맞춘다 — 매도 id 로 덮어쓰고, 이번에 없는 행(지운 매도 · 원가 모르는 매도)은 지운다.
   * **사용자 태그(`userTags` · `userTagsConfirmedAt`)는 덮지 않는다.** 같은 회차를 두 번 돌려도 같은 결과다
   */
  replaceForUser(
    userId: string,
    drafts: DecisionOutcomeDraft[],
    computedAt: Date
  ): Promise<{ written: number; removed: number }>;
  /** 최신 청산이 앞 */
  listOwned(userId: string, limit: number): Promise<DecisionOutcome[]>;
  /** 사용자 태그 확정. 남의 것이면 `null` */
  confirmTags(
    userId: string,
    outcomeId: string,
    tags: string[],
    confirmedAt: Date
  ): Promise<DecisionOutcome | null>;
}

/**
 * 월간 복기 저장 — `monthly_reviews` (FEATURE-009 FR-28 · `DB-REQ-031`).
 *
 * 한 사용자 · 한 달에 한 행이고 **만든 뒤 고치지 않는다**(W06). 저장 모양은 JSON 이고 숫자는 문자열이다 —
 * 읽는 쪽이 `StoredMonthlyReview.payload` 를 응답으로 옮긴다. 모든 조회가 `userId` 로 좁혀진다.
 */
export interface MonthlyReviewStore {
  find(userId: string, month: string): Promise<StoredMonthlyReview | null>;
  /** 저장된 달(최신이 앞) */
  listMonths(userId: string, limit: number): Promise<string[]>;
  /** 이미 있으면 **덮지 않고** 있는 것을 돌려준다 — 배치 · 요청이 겹쳐도 한 벌 */
  saveIfAbsent(userId: string, review: MonthlyReview, generatedAt: Date): Promise<StoredMonthlyReview>;
}

/** Decimal → 문자열, Date → ISO 문자열로 굳힌 모양 */
export type Jsonified<T> = T extends Decimal
  ? string
  : T extends Date
    ? string
    : T extends Array<infer U>
      ? Array<Jsonified<U>>
      : T extends object
        ? { [K in keyof T]: Jsonified<T[K]> }
        : T;

export interface StoredMonthlyReview {
  month: string;
  payload: Jsonified<MonthlyReview>;
  generatedAt: Date;
}

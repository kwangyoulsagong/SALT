import {
  ANSWER_MATERIALS,
  COACH_CHIP_QUESTION,
  COACH_HISTORY_KEEP_DAYS,
  COACH_HISTORY_KEEP_QUESTIONS,
  coachHistoryCutoff,
  composeCoachAnswer,
  composeCoachBriefing,
  type CoachBriefing,
  conversationTitle,
  routeCoachQuestion,
  CoachConversationNotFoundError,
  type BehaviorAnswerFacts,
  type CoachAnswer,
  type CoachAnswerFacts,
  type CoachConversationRecord,
  type CoachConversationStore,
  type CoachMessageRecord,
  type CoachQuestionChip,
  type RiskAnswerFacts,
  type SellPlanFacts,
} from "../domain";
import type { BehaviorCoachView } from "./AnalyzeTradingBehavior";
import type {
  ConversationCard,
  ConversationCardPayload,
} from "./lib/recommendationCard";
import type { RiskBudgetView } from "./ManageRiskBudget";

/**
 * 코치 대화 유스케이스(F006 C절 · `SRV-REQ-028` FR-1~10 · 20~25 · `SRV-REQ-029`).
 *
 * 2단계 — `AskCoach`(POST) 가 질문과 답 자리(messageId 선발급)를 저장하고 바로 돌아간다. `AnswerCoachMessage`(GET 스트림)가
 * 답을 만든다. 답은 규칙 문장이라 몇백 ms 안에 끝나고 LLM 이 없다 — 재연결 · 겹친 스트림은 조건부 UPDATE 로 한 벌(FR-3 · 4).
 */

// ─── 재료 — 같은 컨텍스트의 기존 유스케이스(좁힌 모양만 받는다 — 시험에서 바꿔 끼운다) ───

export interface CoachAnswerSources {
  riskBudget: { execute(userId: string): Promise<RiskBudgetView> };
  profitPlans: {
    execute(userId: string): Promise<{
      plans: Array<{
        symbol: string;
        status: string;
        currentPrice: number;
        unrealizedProfitRate: number;
        stages: Array<{ label: string; price: number }>;
      }>;
    }>;
  };
  behavior: { execute(userId: string): Promise<BehaviorCoachView> };
  /** 가장 최근 저장 추천을 3종 게이트를 지난 카드로(`ReadConversationCard`) — 코치 상세와 같은 조립 */
  card: { execute(userId: string): Promise<ConversationCard | null> };
  /**
   * 이번 주 적립 계획 — 밴드 적립(`plan`, portfolio 서비스) 주간 계획의 좁힌 모양. 코치는 `plan` 을 import 하지 않는다 — 조립(`composition.ts`)이
   * 끼운다(서비스가 갈라지면 이 자리만 원격 호출로, `msa-services.md`). 2026-11-19
   */
  weeklyPlan: {
    execute(userId: string): Promise<{
      configured: boolean;
      totalKrw: number | null;
      items: Array<{ asset: "btc" | "kospi"; amountKrw: number | null; fixed: boolean }>;
    }>;
  };
}

const SELL_STATUSES = new Set<SellPlanFacts["status"]>([
  "take_profit_review",
  "stop_loss_review",
  "raise_stop_review",
  "hold_plan",
]);

const toRiskFacts = (view: RiskBudgetView): RiskAnswerFacts => ({
  totalValueKrw: view.totalValue.toDecimal(),
  drawdown: {
    status: view.gauges.drawdown.status,
    budgetKrw: view.gauges.drawdown.budget?.toDecimal() ?? null,
    usedKrw: view.gauges.drawdown.used?.toDecimal() ?? null,
  },
  concentration: {
    status: view.gauges.concentration.status,
    topSymbol: view.gauges.concentration.topSymbol,
    topWeight: view.gauges.concentration.topWeight,
    limit: view.gauges.concentration.limit,
  },
  btcBeta: {
    status: view.gauges.btcBeta.status,
    btcEquivalentKrw: view.gauges.btcBeta.btcEquivalent?.toDecimal() ?? null,
  },
});

const toBehaviorFacts = (view: BehaviorCoachView): BehaviorAnswerFacts => ({
  status: view.status,
  transactionCount: view.evidence.transactionCount,
  minimumRequired: view.evidence.minimumRequired ?? null,
  warnings: view.warnings.map((warning) => ({
    title: warning.title,
    message: warning.message,
  })),
});

/** 재료 하나 실패 = 그 칸만 `null`(대화는 산다 — FR-25). 실패 원인은 로그로만 */
const settle = async <T>(
  work: () => Promise<T>,
  onError: (error: unknown) => void,
): Promise<T | null> => {
  try {
    return await work();
  } catch (error) {
    onError(error);
    return null;
  }
};

export interface CoachAnswerResult {
  answer: CoachAnswer;
  /** 답에 붙은 카드(완성 객체 — SSE `message.card` 한 번). 없으면 `null` */
  card: Record<string, unknown> | null;
  /** 이미 저장돼 있던 답을 다시 보낸 것 — 재연결(FR-3 · `SRV-REQ-029` FR-4) */
  replayed: boolean;
}

/** 질문을 받는다 — 질문 · 답 자리 저장만, 답은 만들지 않는다(`SRV-REQ-029` FR-1 · 2) */
export class AskCoach {
  constructor(
    private readonly store: CoachConversationStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    userId: string,
    command: {
      conversationId: string | null;
      content: string | null;
      chip: CoachQuestionChip | null;
    },
  ): Promise<{
    conversationId: string;
    questionId: string;
    messageId: string;
  }> {
    // 칩만 눌렀으면 칩 문장이 사용자 말풍선이 된다. DTO 가 둘 중 하나는 있게 막는다
    const question = (
      command.content?.trim() ||
      (command.chip ? COACH_CHIP_QUESTION[command.chip] : "")
    ).trim();
    const saved = await this.store.ask({
      userId,
      conversationId: command.conversationId,
      title: conversationTitle(question),
      question: command.chip
        ? `${CHIP_MARK}${command.chip}${CHIP_MARK}${question}`
        : question,
      at: this.now(),
    });
    if (!saved) throw new CoachConversationNotFoundError();
    // 보관 한도 — 대화는 질문할 때만 늘어나므로 질문마다 오래된 것을 지운다(cron 0, `SRV-REQ-028` FR-30). 실패해도 질문은 그대로
    await this.pruneHistory(userId).catch(() => undefined);
    return {
      conversationId: saved.conversationId,
      questionId: saved.questionId,
      messageId: saved.answerId,
    };
  }

  private async pruneHistory(userId: string): Promise<void> {
    const times = await this.store.recentQuestionTimes(userId, COACH_HISTORY_KEEP_QUESTIONS);
    const cutoff = coachHistoryCutoff(times, this.now());
    if (cutoff) await this.store.deleteHistoryBefore(userId, cutoff);
  }
}

/**
 * 칩으로 물은 질문은 저장 문장 앞에 칩 코드를 감춰 둔다 — 스트림이 같은 분류를 다시 얻는다(칩이 이긴다, FR-21).
 * 화면에 나갈 땐 `visibleQuestion` 이 벗긴다
 */
const CHIP_MARK = "⁣";
const CHIP_PATTERN = new RegExp(`^${CHIP_MARK}([a-z_]+)${CHIP_MARK}`);

export const visibleQuestion = (content: string): string =>
  content.replace(CHIP_PATTERN, "");
const chipOf = (content: string): CoachQuestionChip | null => {
  const code = CHIP_PATTERN.exec(content)?.[1];
  return code && code in COACH_CHIP_QUESTION
    ? (code as CoachQuestionChip)
    : null;
};

/** 답 하나 — 저장돼 있으면 그대로, `streaming` 이면 지금 만든다(`SRV-REQ-028` FR-1 · 3) */
export class AnswerCoachMessage {
  constructor(
    private readonly store: CoachConversationStore,
    private readonly sources: CoachAnswerSources,
    private readonly log: (message: string) => void = () => undefined,
    private readonly now: () => Date = () => new Date(),
    /** 답 자리가 이보다 오래 `streaming` 이면 만들지 않고 실패로(FR-7 — 대화당 60초) */
    private readonly maxAnswerMs = 60_000,
  ) {}

  async execute(
    userId: string,
    messageId: string,
  ): Promise<CoachAnswerResult | { failed: string }> {
    const message = await this.store.findMessage(userId, messageId);
    if (!message || message.role !== "assistant")
      throw new CoachConversationNotFoundError();
    if (message.status === "complete")
      return {
        answer: storedAnswer(message),
        card: message.card,
        replayed: true,
      };
    if (message.status === "failed")
      return { failed: message.errorCode ?? "LLM_ERROR" };
    if (this.now().getTime() - message.createdAt.getTime() > this.maxAnswerMs) {
      await this.store.failAnswer(message.id, "LLM_TIMEOUT");
      return { failed: "LLM_TIMEOUT" };
    }

    const question = await this.store.findQuestionFor(message);
    const content = question?.content ?? "";
    const intent = routeCoachQuestion(
      visibleQuestion(content),
      chipOf(content),
    );
    const { facts, card } = await this.gather(userId, ANSWER_MATERIALS[intent]);
    const answer = composeCoachAnswer(intent, facts);
    if (answer.dropped > 0)
      this.log(
        `코치 대화 규칙 문장 ${answer.dropped}개가 검사기에 걸림 — ${intent}`,
      );
    const payload: ConversationCardPayload | null = card?.payload ?? null;

    const wrote = await this.store.completeAnswer(message.id, {
      content: answer.sentences.join("\n"),
      intent,
      links: answer.links,
      gaps: answer.gaps,
      card: payload as Record<string, unknown> | null,
      insightId: card?.insightId ?? null,
      explanationSource: "rule",
    });
    if (wrote)
      return {
        answer,
        card: payload as Record<string, unknown> | null,
        replayed: false,
      };
    // 겹친 스트림이 먼저 채웠다 — 그 답을 보낸다(같은 질문에 답이 둘이 되지 않게)
    const winner = await this.store.findMessage(userId, messageId);
    if (winner?.status === "complete")
      return {
        answer: storedAnswer(winner),
        card: winner.card,
        replayed: true,
      };
    return { failed: winner?.errorCode ?? "LLM_ERROR" };
  }

  private async gather(
    userId: string,
    materials: readonly string[],
  ): Promise<{ facts: CoachAnswerFacts; card: ConversationCard | null }> {
    const facts = await gatherFacts(this.sources, userId, materials, this.log);
    return facts;
  }
}

/** 카드 실패와 "추천 없음"을 가른다 — 실패는 `"unavailable"`(문장이 그렇게 말한다), 없음은 `null`(문장 없음) */
const UNAVAILABLE_CARD = "unavailable" as const;

const gatherFacts = async (
  sources: CoachAnswerSources,
  userId: string,
  materials: readonly string[],
  log: (message: string) => void,
): Promise<{ facts: CoachAnswerFacts; card: ConversationCard | null }> => {
  const want = new Set(materials);
  const fail = (name: string) => (error: unknown) =>
    log(`코치 대화 재료 실패 — ${name}: ${(error as Error).name}`);
  const [risk, plans, behavior, card, weeklyPlan] = await Promise.all([
    want.has("risk")
      ? settle(() => sources.riskBudget.execute(userId), fail("risk"))
      : Promise.resolve(undefined),
    want.has("plans")
      ? settle(() => sources.profitPlans.execute(userId), fail("plans"))
      : Promise.resolve(undefined),
    want.has("behavior")
      ? settle(() => sources.behavior.execute(userId), fail("behavior"))
      : Promise.resolve(undefined),
    want.has("recommendation")
      ? sources.card.execute(userId).catch((error: unknown) => {
          fail("recommendation")(error);
          return UNAVAILABLE_CARD as typeof UNAVAILABLE_CARD;
        })
      : Promise.resolve(undefined),
    want.has("weekly_plan")
      ? settle(() => sources.weeklyPlan.execute(userId), fail("weekly_plan"))
      : Promise.resolve(undefined),
  ]);
  const facts: CoachAnswerFacts = {
    recommendation:
      card === undefined
        ? undefined
        : card === UNAVAILABLE_CARD
          ? "unavailable"
          : card === null
            ? null
            : card.summary,
    risk: risk === undefined ? undefined : risk && toRiskFacts(risk),
    plans:
      plans === undefined
        ? undefined
        : plans &&
          plans.plans
            .filter(
              (
                plan,
              ): plan is typeof plan & { status: SellPlanFacts["status"] } =>
                SELL_STATUSES.has(plan.status as SellPlanFacts["status"]),
            )
            .map((plan) => ({
              symbol: plan.symbol,
              status: plan.status,
              unrealizedProfitRate: plan.unrealizedProfitRate,
              currentPrice: plan.currentPrice,
              stages: plan.stages.map((stage) => ({
                label: stage.label,
                price: stage.price,
              })),
            })),
    behavior:
      behavior === undefined
        ? undefined
        : behavior && toBehaviorFacts(behavior),
    // 이번 주 적립 — 금액은 옮기기만. 못 읽었으면 `undefined`(문장은 "불러올 수 없어요")
    weeklyPlan:
      weeklyPlan === undefined || weeklyPlan === null
        ? undefined
        : {
            configured: weeklyPlan.configured,
            totalKrw: weeklyPlan.totalKrw,
            items: weeklyPlan.items.map((item) => ({ asset: item.asset, amountKrw: item.amountKrw })),
            fixed: weeklyPlan.items.every((item) => item.fixed),
          },
    // 한 번 거래 손실 한도 — 위험 예산 설정의 원 환산. 위험 예산을 못 읽었으면 `undefined`(못 읽음), 안 정했으면 `null`
    perTradeMaxLossKrw:
      risk === undefined || risk === null
        ? undefined
        : (risk.settings.perTradeMaxLossKrw?.toDecimal() ?? null),
  };
  return {
    facts,
    card: card === undefined || card === UNAVAILABLE_CARD ? null : card,
  };
};

/**
 * 오늘의 브리핑 — 대화 첫 메시지(FEATURE-006 FR-21 · `SRV-REQ-028` 2단계). 저장하지 않는다(화면을 열 때마다 대화 행이 생기지 않게).
 * 재료는 답과 같은 셋(보유 점검 · 위험 예산 · 저장 추천 카드) — 숫자를 새로 만들지 않는다
 */
export class GetCoachBriefing {
  constructor(
    private readonly sources: CoachAnswerSources,
    private readonly log: (message: string) => void = () => undefined,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    userId: string,
  ): Promise<
    CoachBriefing & { generatedAt: Date; card: Record<string, unknown> | null }
  > {
    const { facts, card } = await gatherFacts(
      this.sources,
      userId,
      ["plans", "risk", "recommendation"],
      this.log,
    );
    const briefing = composeCoachBriefing({
      plans: facts.plans ?? null,
      risk: facts.risk ?? null,
      recommendation: facts.recommendation ?? null,
    });
    if (briefing.dropped > 0)
      this.log(`코치 브리핑 규칙 문장 ${briefing.dropped}개가 검사기에 걸림`);
    return {
      ...briefing,
      generatedAt: this.now(),
      card: (card?.payload as Record<string, unknown> | undefined) ?? null,
    };
  }
}

const storedAnswer = (message: CoachMessageRecord): CoachAnswer => ({
  intent: message.intent ?? "other",
  sentences: message.content ? message.content.split("\n") : [],
  links: message.links,
  gaps: message.gaps,
  dropped: 0,
});

/** 대화 목록 · 메시지 목록 · 지우기 — 읽기는 이 사람 것만, 지우기는 사용자 요청일 때만(`SRV-REQ-029` FR-28 · 29) */
export class ListCoachConversations {
  constructor(private readonly store: CoachConversationStore) {}
  async execute(userId: string, limit: number, cursor: string | null) {
    const items: CoachConversationRecord[] = await this.store.listConversations(
      userId,
      limit,
      cursor,
    );
    return {
      items,
      nextCursor: items.length === limit ? items[items.length - 1].id : null,
    };
  }
}

export class ListCoachMessages {
  constructor(
    private readonly store: CoachConversationStore,
    /** 읽기 전에 멈춘 답을 실패로 — 재기동으로 남은 `streaming` 이 목록에 영원히 "답하는 중"으로 남지 않게(FR-8). 워커 대신 읽는 자리에서 */
    private readonly failStale: FailStaleCoachAnswers,
  ) {}
  async execute(
    userId: string,
    conversationId: string,
    limit: number,
    cursor: string | null,
  ) {
    await this.failStale.execute();
    const items = await this.store.listMessages(
      userId,
      conversationId,
      limit,
      cursor,
    );
    if (!items) throw new CoachConversationNotFoundError();
    return {
      items: items.map((item) => ({
        ...item,
        content:
          item.role === "user" ? visibleQuestion(item.content) : item.content,
      })),
      nextCursor: items.length === limit ? items[items.length - 1].id : null,
      /** 보관 한도(화면 맨 위 한 줄 — 숫자는 서버 한 곳, `SRV-REQ-029` FR-30) */
      keep: { questions: COACH_HISTORY_KEEP_QUESTIONS, days: COACH_HISTORY_KEEP_DAYS },
    };
  }
}

export class DeleteCoachConversation {
  constructor(private readonly store: CoachConversationStore) {}
  async execute(userId: string, conversationId: string) {
    if (!(await this.store.deleteConversation(userId, conversationId)))
      throw new CoachConversationNotFoundError();
  }
}

/** 재기동 뒤 · 주기로 — 60초 넘게 `streaming` 인 답을 실패로(FR-8). 워커가 부른다 */
export class FailStaleCoachAnswers {
  constructor(
    private readonly store: CoachConversationStore,
    private readonly now: () => Date = () => new Date(),
    private readonly maxAnswerMs = 60_000,
  ) {}
  async execute(): Promise<number> {
    return this.store.failStale(
      new Date(this.now().getTime() - this.maxAnswerMs),
    );
  }
}

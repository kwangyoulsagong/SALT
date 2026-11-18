import {
  ANSWER_MATERIALS,
  COACH_CHIP_QUESTION,
  composeCoachAnswer,
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
}

const SELL_STATUSES = new Set<SellPlanFacts["status"]>(["take_profit_review", "stop_loss_review", "raise_stop_review", "hold_plan"]);

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
  btcBeta: { status: view.gauges.btcBeta.status, btcEquivalentKrw: view.gauges.btcBeta.btcEquivalent?.toDecimal() ?? null },
});

const toBehaviorFacts = (view: BehaviorCoachView): BehaviorAnswerFacts => ({
  status: view.status,
  transactionCount: view.evidence.transactionCount,
  minimumRequired: view.evidence.minimumRequired ?? null,
  warnings: view.warnings.map((warning) => ({ title: warning.title, message: warning.message })),
});

/** 재료 하나 실패 = 그 칸만 `null`(대화는 산다 — FR-25). 실패 원인은 로그로만 */
const settle = async <T>(work: () => Promise<T>, onError: (error: unknown) => void): Promise<T | null> => {
  try {
    return await work();
  } catch (error) {
    onError(error);
    return null;
  }
};

export interface CoachAnswerResult {
  answer: CoachAnswer;
  /** 이미 저장돼 있던 답을 다시 보낸 것 — 재연결(FR-3 · `SRV-REQ-029` FR-4) */
  replayed: boolean;
}

/** 질문을 받는다 — 질문 · 답 자리 저장만, 답은 만들지 않는다(`SRV-REQ-029` FR-1 · 2) */
export class AskCoach {
  constructor(
    private readonly store: CoachConversationStore,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(
    userId: string,
    command: { conversationId: string | null; content: string | null; chip: CoachQuestionChip | null }
  ): Promise<{ conversationId: string; questionId: string; messageId: string }> {
    // 칩만 눌렀으면 칩 문장이 사용자 말풍선이 된다. DTO 가 둘 중 하나는 있게 막는다
    const question = (command.content?.trim() || (command.chip ? COACH_CHIP_QUESTION[command.chip] : "")).trim();
    const saved = await this.store.ask({
      userId,
      conversationId: command.conversationId,
      title: conversationTitle(question),
      question: command.chip ? `${CHIP_MARK}${command.chip}${CHIP_MARK}${question}` : question,
      at: this.now(),
    });
    if (!saved) throw new CoachConversationNotFoundError();
    return { conversationId: saved.conversationId, questionId: saved.questionId, messageId: saved.answerId };
  }
}

/**
 * 칩으로 물은 질문은 저장 문장 앞에 칩 코드를 감춰 둔다 — 스트림이 같은 분류를 다시 얻는다(칩이 이긴다, FR-21).
 * 화면에 나갈 땐 `visibleQuestion` 이 벗긴다
 */
const CHIP_MARK = "⁣";
const CHIP_PATTERN = new RegExp(`^${CHIP_MARK}([a-z_]+)${CHIP_MARK}`);

export const visibleQuestion = (content: string): string => content.replace(CHIP_PATTERN, "");
const chipOf = (content: string): CoachQuestionChip | null => {
  const code = CHIP_PATTERN.exec(content)?.[1];
  return code && code in COACH_CHIP_QUESTION ? (code as CoachQuestionChip) : null;
};

/** 답 하나 — 저장돼 있으면 그대로, `streaming` 이면 지금 만든다(`SRV-REQ-028` FR-1 · 3) */
export class AnswerCoachMessage {
  constructor(
    private readonly store: CoachConversationStore,
    private readonly sources: CoachAnswerSources,
    private readonly log: (message: string) => void = () => undefined,
    private readonly now: () => Date = () => new Date(),
    /** 답 자리가 이보다 오래 `streaming` 이면 만들지 않고 실패로(FR-7 — 대화당 60초) */
    private readonly maxAnswerMs = 60_000
  ) {}

  async execute(userId: string, messageId: string): Promise<CoachAnswerResult | { failed: string }> {
    const message = await this.store.findMessage(userId, messageId);
    if (!message || message.role !== "assistant") throw new CoachConversationNotFoundError();
    if (message.status === "complete") return { answer: storedAnswer(message), replayed: true };
    if (message.status === "failed") return { failed: message.errorCode ?? "LLM_ERROR" };
    if (this.now().getTime() - message.createdAt.getTime() > this.maxAnswerMs) {
      await this.store.failAnswer(message.id, "LLM_TIMEOUT");
      return { failed: "LLM_TIMEOUT" };
    }

    const question = await this.store.findQuestionFor(message);
    const content = question?.content ?? "";
    const intent = routeCoachQuestion(visibleQuestion(content), chipOf(content));
    const facts = await this.gather(userId, ANSWER_MATERIALS[intent]);
    const answer = composeCoachAnswer(intent, facts);
    if (answer.dropped > 0) this.log(`코치 대화 규칙 문장 ${answer.dropped}개가 검사기에 걸림 — ${intent}`);

    const wrote = await this.store.completeAnswer(message.id, {
      content: answer.sentences.join("\n"),
      intent,
      links: answer.links,
      gaps: answer.gaps,
      explanationSource: "rule",
    });
    if (wrote) return { answer, replayed: false };
    // 겹친 스트림이 먼저 채웠다 — 그 답을 보낸다(같은 질문에 답이 둘이 되지 않게)
    const winner = await this.store.findMessage(userId, messageId);
    if (winner?.status === "complete") return { answer: storedAnswer(winner), replayed: true };
    return { failed: winner?.errorCode ?? "LLM_ERROR" };
  }

  private async gather(userId: string, materials: readonly string[]): Promise<CoachAnswerFacts> {
    const want = new Set(materials);
    const fail = (name: string) => (error: unknown) => this.log(`코치 대화 재료 실패 — ${name}: ${(error as Error).name}`);
    const [risk, plans, behavior] = await Promise.all([
      want.has("risk") ? settle(() => this.sources.riskBudget.execute(userId), fail("risk")) : Promise.resolve(undefined),
      want.has("plans") ? settle(() => this.sources.profitPlans.execute(userId), fail("plans")) : Promise.resolve(undefined),
      want.has("behavior") ? settle(() => this.sources.behavior.execute(userId), fail("behavior")) : Promise.resolve(undefined),
    ]);
    return {
      risk: risk === undefined ? undefined : risk && toRiskFacts(risk),
      plans:
        plans === undefined
          ? undefined
          : plans &&
            plans.plans
              .filter((plan): plan is typeof plan & { status: SellPlanFacts["status"] } =>
                SELL_STATUSES.has(plan.status as SellPlanFacts["status"])
              )
              .map((plan) => ({
                symbol: plan.symbol,
                status: plan.status,
                unrealizedProfitRate: plan.unrealizedProfitRate,
                currentPrice: plan.currentPrice,
                stages: plan.stages.map((stage) => ({ label: stage.label, price: stage.price })),
              })),
      behavior: behavior === undefined ? undefined : behavior && toBehaviorFacts(behavior),
      // 한 번 거래 손실 한도 — 위험 예산 설정의 원 환산. 위험 예산을 못 읽었으면 `undefined`(못 읽음), 안 정했으면 `null`
      perTradeMaxLossKrw:
        risk === undefined || risk === null ? undefined : (risk.settings.perTradeMaxLossKrw?.toDecimal() ?? null),
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
    const items: CoachConversationRecord[] = await this.store.listConversations(userId, limit, cursor);
    return { items, nextCursor: items.length === limit ? items[items.length - 1].id : null };
  }
}

export class ListCoachMessages {
  constructor(
    private readonly store: CoachConversationStore,
    /** 읽기 전에 멈춘 답을 실패로 — 재기동으로 남은 `streaming` 이 목록에 영원히 "답하는 중"으로 남지 않게(FR-8). 워커 대신 읽는 자리에서 */
    private readonly failStale: FailStaleCoachAnswers
  ) {}
  async execute(userId: string, conversationId: string, limit: number, cursor: string | null) {
    await this.failStale.execute();
    const items = await this.store.listMessages(userId, conversationId, limit, cursor);
    if (!items) throw new CoachConversationNotFoundError();
    return {
      items: items.map((item) => ({ ...item, content: item.role === "user" ? visibleQuestion(item.content) : item.content })),
      nextCursor: items.length === limit ? items[items.length - 1].id : null,
    };
  }
}

export class DeleteCoachConversation {
  constructor(private readonly store: CoachConversationStore) {}
  async execute(userId: string, conversationId: string) {
    if (!(await this.store.deleteConversation(userId, conversationId))) throw new CoachConversationNotFoundError();
  }
}

/** 재기동 뒤 · 주기로 — 60초 넘게 `streaming` 인 답을 실패로(FR-8). 워커가 부른다 */
export class FailStaleCoachAnswers {
  constructor(
    private readonly store: CoachConversationStore,
    private readonly now: () => Date = () => new Date(),
    private readonly maxAnswerMs = 60_000
  ) {}
  async execute(): Promise<number> {
    return this.store.failStale(new Date(this.now().getTime() - this.maxAnswerMs));
  }
}

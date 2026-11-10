import { randomUUID } from "node:crypto";

import { logger } from "../../shared/config/logger";

import {
  assembleExplanationFacts,
  EXPLANATION_NEWS_MAX,
  explanationFactsHash,
  LLM_BUDGET_WINDOW_MS,
  llmBudgetVerdict,
  resolveLlmLimits,
  completeExplanation,
  guardExplanationLine,
  templateExplanation,
  verifyExplanation,
  type ExplainClient,
  type ExplainProvider,
  type ExplanationSource,
} from "../domain";
import type {
  CoachExplainer,
  CoachExplanation,
  CoachExplanationInput,
  CoachMode,
  ExplainCaller,
  ExplainHooks,
  JudgmentBlockedReason,
  LlmBudgetLimits,
  LlmUsageStore,
  MarketProbe,
  NewsProbe,
  PortfolioProbe,
  SymbolJudgmentStore,
} from "../domain";
import { collectJudgmentMaterials, indicatorFor, judgeSymbol, materialGuards } from "./lib/judgeSymbols";
import {
  attachJudgmentTrack,
  JUDGMENT_DISCLAIMER,
  type ModeCoachView,
} from "./lib/judgmentTrack";

/** 상한에 닿아 LLM 을 부르지 않았다 — LLM 실패와 같은 길(템플릿)로 간다 */
class LlmBudgetReached extends Error {}

export interface ExplainOptions {
  now?: () => Date;
  /** LLM 사용량 원장(F010 슬라이스 7). 없으면 상한 없이 부른다 */
  usage?: LlmUsageStore;
  /** 비운 칸은 `DEFAULT_LLM_BUDGET` */
  limits?: Partial<LlmBudgetLimits>;
  /**
   * LLM 다듬기를 부르나(`SRV-REQ-037` FR-16). `false` 면 템플릿만 — 스트림은 다듬기 · 검사 단계를 `skipped` 로 내고 `source: template`.
   * 없으면 켜짐. 운영 조립은 env `COACH_EXPLAIN_LLM`(기본 on)
   */
  llmEnabled?: boolean;
  /**
   * 국내 주식 백테스트 성적(F011 슬라이스 7b, 사용자 결정 2026-10-26) — 종목 판단 카드와 같은 출처 선택. 해설 문장(LLM)
   * 입력엔 성적 숫자가 없다 — 카드(`trackRecord`)에 `sampleOrigin` 이 붙어 화면이 모의 라벨을 단다
   */
  backtestJudgments?: SymbolJudgmentStore | null;
}

/** 해설 요청 — 종목과 관점뿐이다. 사실은 서버가 조립한다(C01 · `SRV-REQ-025` FR-58) */
export interface CoachExplainRequest {
  symbol: string;
  mode: CoachMode;
  /** 보는 사람 이메일 — 국내 주식 종목은 소유자만(F011 §정책). 본문이 아니라 인증에서 온다 */
  viewerEmail?: string;
  /** 요청이 온 곳 — BFF 가 정한 헤더(`X-Salt-Client`). 모바일은 로컬 CLI 를 고르지 않는다(`SRV-REQ-050` FR-4) */
  client?: ExplainClient;
}

/** 해설이 쓴 사실 — 언제 모은 무엇인지. `hash` 가 같으면 같은 사실로 만든 문장이다 */
export interface ExplanationFactsRef {
  asOf: string;
  hash: string;
}

/**
 * 판단은 열렸는데 사실을 못 모았다 — 지금은 현재가가 없을 때뿐이다. 가격 없는 해설은 만들지 않는다.
 * 판단 게이트의 사유(`JudgmentBlockedReason`)와 섞지 않는다 — 그건 성적표의 사유다.
 */
export type ExplainBlockedReason = JudgmentBlockedReason | "facts_unavailable";

/**
 * 해설 결과 (`SRV-REQ-025` FR-50 · FR-51).
 *
 * 렌더되는 해설에는 3종(근거 · 성적표 · 실패사례)이 **같이 실린다** — 해설 카드가 판단 카드와
 * 따로 떠도 공통 수용 기준 1 을 혼자 지킨다. 막히면 **LLM 을 부르지 않았다**는 뜻이다.
 */
export type ExplainResult =
  | (Omit<CoachExplanation, "provider" | "callId"> & {
      renderable: true;
      /**
       * 문장 출처(추가 필드, 2026-09-24). `llm` — 검증 통과 · `llm_checked` — 일부 문장을 걸러 템플릿으로 채움 ·
       * `template` — LLM 실패, 전부 템플릿. 화면은 `template` 에 "규칙 기반 설명" 배지를 단다(FEATURE-004 UX Degraded)
       */
      source: ExplanationSource;
      /** 걸러낸 문장 수(말투 · 지어낸 숫자). 관측용 */
      droppedSentences: number;
      /** 다듬은 공급자(`SRV-REQ-050` FR-10) — 템플릿이면 `null` */
      provider: ExplainProvider | null;
      validity: ModeCoachView["judgment"]["validity"];
      trackRecord: ModeCoachView["trackRecord"];
      failureCases: ModeCoachView["failureCases"];
      facts: ExplanationFactsRef;
    })
  | { renderable: false; blockedReason: ExplainBlockedReason };

/** 해설 스트림의 단계(FEATURE-008 FR-61) — 실제로 그 일을 할 때만 켜진다(가짜 타이머 아님) */
export type ExplainStep = "judgment" | "draft" | "polish" | "verify";

/** 해설 본문 칸. 목록 칸은 `index` 로 항목을 가른다 */
export type ExplainSection = "modeReasoning" | "keyDrivers" | "risks" | "newsSummary";

/**
 * 인용 출처 — 해설에 들어간 뉴스의 출처(FEATURE-008 FR-44). 문장이 아니라 입력에서 온다.
 * `url` 은 `http(s)` 만(`citableUrl`), 없으면 `null` — 화면은 이름만 그린다. `publishedAt` 은 기사 게시 시각(ISO)
 */
export interface ExplainCitation {
  title: string;
  source: string | null;
  url: string | null;
  publishedAt: string | null;
}

/**
 * 해설 스트림 이벤트 (`SRV-REQ-037` FR-8 · `bff/.claude/rules/streaming-sse.md` §3 이름).
 *
 * 순서: `start` → `step(judgment)` → (`blocked` | `card`) → `step(draft)` · `delta`… → `step(polish)` →
 * `step(verify)` → (`replace`) → `done`. LLM 원문은 **절대 흘리지 않는다** — 흐르는 글자는 템플릿(입력 사실로만
 * 만든 문장)이고, LLM 문장은 검증을 통과한 뒤 `replace` 로 한 번에 바뀐다(FR-47).
 */
export type ExplainStreamEvent =
  | { event: "message.start"; data: { messageId: string; createdAt: string } }
  | {
      event: "message.step";
      data: {
        step: ExplainStep;
        status: "active" | "done" | "skipped";
        /**
         * 토큰 스트림이 시작될 때(`polish:active`)만 — 누가 쓰는지 화면이 미리 안다. 스트림이 `done` 없이 끊겨도
         * 이미 흘린 문장을 "규칙 기반"으로 잘못 붙이지 않게(`SRV-REQ-050` FR-13, 2026-11-02 실측: 맥 잠자기로 끊김)
         */
        provider?: ExplainProvider;
      };
    }
  | { event: "message.blocked"; data: { blockedReason: ExplainBlockedReason } }
  | {
      event: "message.card";
      data: {
        validity: ModeCoachView["judgment"]["validity"];
        trackRecord: ModeCoachView["trackRecord"];
        failureCases: ModeCoachView["failureCases"];
        disclaimer: string;
        citations: ExplainCitation[];
        facts: ExplanationFactsRef;
      };
    }
  | { event: "message.delta"; data: { section: ExplainSection; index: number; text: string } }
  | {
      event: "message.replace";
      data: Pick<CoachExplanation, ExplainSection> & {
        source: ExplanationSource;
        droppedSentences: number;
        provider: ExplainProvider | null;
      };
    }
  | {
      event: "message.done";
      data: {
        messageId: string;
        source: ExplanationSource;
        droppedSentences: number;
        /** 추가만(`SRV-REQ-050` FR-10) — 템플릿이면 `null` */
        provider: ExplainProvider | null;
        generatedAt: string;
      };
    };


/**
 * 문장 끝에서 자른다 — 스트림 한 조각이 한 문장이다. 마침표 **뒤에 공백 · 끝이 올 때만** 문장 끝이다
 * ("+1.23%" 의 점에서 자르지 않는다).
 */
export const sentencesOf = (text: string): string[] => text.match(/.+?[.!?](?=\s|$)\s*|.+/gs) ?? [];

/**
 * 판단 해설 생성 (LLM).
 *
 * 숫자는 **서버가 게이트와 같은 재료로** 모으고 모델은 문장만 만든다(C01). 해설이 판단을 바꾸지 않는다 —
 * 점수 · 행동 · 근거는 이미 정해져 있다.
 *
 * ## 먼저 게이트를 본다 (FR-50)
 *
 * 요청 종목 · 모드의 판단이 3종 게이트를 못 넘으면 **LLM 을 부르지 않고** `renderable: false` 를
 * 200 으로 준다. 화면도 같은 게이트로 버튼을 숨기지만, 뷰모델이 낡았거나 다른 소비처가 부르면
 * 게이트를 못 넘은 판단에 대한 문장이 비용을 들여 만들어진다. 판정은 종목 경로
 * (`GetSymbolCoach`)와 **같은 함수**(`judgeSymbol` · `attachJudgmentTrack`)로 한다.
 *
 * 트랜잭션을 열지 않는다 — LLM 호출이 수 초~수십 초다(`ddd-application.md` §3).
 */
export class ExplainCoachDecision {
  constructor(
    private readonly explainer: CoachExplainer,
    private readonly market: MarketProbe,
    private readonly portfolio: PortfolioProbe,
    private readonly judgments: SymbolJudgmentStore,
    private readonly news: NewsProbe,
    private readonly options: ExplainOptions = {}
  ) {}

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  /**
   * 이번 요청에 LLM 을 불러도 되나(FR-62). 원장이 없으면(테스트 · 조립 전) 상한 없이 간다.
   * **원장을 못 읽으면 막는다** — 비용이 얼마 나갔는지 모르는 채로 부르지 않는다. 막혀도 템플릿 해설은 나간다
   */
  private async llmAllowed(userId: string): Promise<{ allowed: boolean; geminiAllowed: boolean }> {
    if (this.options.llmEnabled === false) return { allowed: false, geminiAllowed: false };
    const usage = this.options.usage;
    if (!usage) return { allowed: true, geminiAllowed: true };
    try {
      const since = new Date(this.now().getTime() - LLM_BUDGET_WINDOW_MS);
      const verdict = llmBudgetVerdict(
        await usage.usageSince(since, userId),
        resolveLlmLimits(this.options.limits)
      );
      // 토큰 상한은 Gemini 만 센다 — 로컬 CLI 는 구독이라 시도 상한만 건다(`SRV-REQ-050` FR-9)
      if (verdict.exceeded === "total_tokens") {
        logger.warn("LLM 토큰 상한 도달 — Gemini 는 쉬고 로컬 CLI 만");
        return { allowed: true, geminiAllowed: false };
      }
      if (!verdict.allowed) logger.warn(`LLM 상한 도달(${verdict.exceeded}) — 템플릿 해설`);
      return { allowed: verdict.allowed, geminiAllowed: verdict.allowed };
    } catch (error) {
      logger.warn(`LLM 사용량 조회 실패 — 템플릿 해설: ${(error as Error).message}`);
      return { allowed: false, geminiAllowed: false };
    }
  }

  /** 다듬기 한 번 — 상한을 보고 요청자 정보를 실어 부른다. 단건 · 스트림이 같은 길이다 */
  private async callExplainer(
    userId: string,
    request: CoachExplainRequest,
    input: CoachExplanationInput,
    signal?: AbortSignal,
    hooks?: ExplainHooks
  ): Promise<CoachExplanation> {
    const budget = await this.llmAllowed(userId);
    if (!budget.allowed) throw new LlmBudgetReached();
    const caller: ExplainCaller = {
      userId,
      email: request.viewerEmail,
      client: request.client ?? "web",
      geminiAllowed: budget.geminiAllowed,
    };
    return this.explainer.explain(input, signal, caller, hooks);
  }

  /** 검사기가 버린 문장 수를 그 시도에 단다(FR-8). 기록 실패가 해설을 막지 않는다 */
  private markDropped(explanation: CoachExplanation, dropped: number): void {
    if (!explanation.callId || !this.options.usage) return;
    this.options.usage
      .markDropped(explanation.callId, dropped)
      .catch((error: unknown) => logger.warn(`버린 문장 수 기록 실패: ${(error as Error).message}`));
  }

  async execute(
    userId: string,
    request: CoachExplainRequest,
    signal?: AbortSignal
  ): Promise<ExplainResult> {
    const prepared = await this.prepare(userId, request);
    if (!prepared.ok) {
      return { renderable: false, blockedReason: prepared.blockedReason };
    }
    const { view, input, facts } = prepared;

    const verified = await this.polish(userId, request, input, signal);
    // 원장 행 id 는 서버 안의 것 — 응답에 싣지 않는다
    const { callId: _callId, provider: _provider, ...explanation } = verified.explanation;

    return {
      ...explanation,
      source: verified.source,
      droppedSentences: verified.dropped.length,
      provider: verified.provider,
      // 면책은 판단 경로와 같은 문장이다 — 모델이 쓴 면책은 쓰지 않는다
      disclaimer: JUDGMENT_DISCLAIMER,
      renderable: true,
      validity: view.judgment.validity,
      trackRecord: view.trackRecord,
      failureCases: view.failureCases,
      facts,
    };
  }

  /**
   * 스트림 해설 (FEATURE-008 FR-47 · FR-60 · FR-61 · `SRV-REQ-050` FR-13).
   *
   * - **토큰 스트림 공급자(로컬 Claude)**: 줄(문장)이 끝날 때마다 검사하고 통과한 문장을 바로 흘린다. 템플릿을 먼저 쏟고
   *   통째로 갈아 끼우던 것(2026-11-02 사용자 "스트리밍이 안 되고 정보가 짝 나온다")을 대신한다. 빈 칸만 끝에 템플릿 `replace`
   * - **그 밖(Gemini · Codex)**: 템플릿을 먼저 흘리고 검사를 통과한 LLM 문장으로 `replace`(예전 길) — 기다리게 하지 않는다
   *
   * 단계 이벤트는 실제 작업 경계에서만 낸다. 끊기면(`signal`) 더 내지 않는다.
   */
  async stream(
    userId: string,
    request: CoachExplainRequest,
    emit: (event: ExplainStreamEvent) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const messageId = randomUUID();
    const send = (event: ExplainStreamEvent) => {
      if (!signal?.aborted) emit(event);
    };
    send({ event: "message.start", data: { messageId, createdAt: new Date().toISOString() } });

    send({ event: "message.step", data: { step: "judgment", status: "active" } });
    const prepared = await this.prepare(userId, request);
    send({ event: "message.step", data: { step: "judgment", status: "done" } });
    if (!prepared.ok) {
      send({ event: "message.blocked", data: { blockedReason: prepared.blockedReason } });
      return;
    }
    const { view, input, facts } = prepared;
    send({
      event: "message.card",
      data: {
        validity: view.judgment.validity,
        trackRecord: view.trackRecord,
        failureCases: view.failureCases,
        disclaimer: JUDGMENT_DISCLAIMER,
        citations: (input.news ?? []).map((n) => ({
          title: n.title,
          source: n.source ?? null,
          url: n.url ?? null,
          publishedAt: n.publishedAt ?? null,
        })),
        facts,
      },
    });

    const now = new Date();
    const template = templateExplanation(input, now);

    // ── 화면에 이미 나간 것 ──────────────────────────────────────────────────────────
    // `template` — 템플릿 문장을 흘렸다(스트리밍 못 하는 공급자 · 실패). 그 뒤 LLM 문장은 `replace` 로만 바뀐다
    // `streamed` — 검사를 통과한 LLM 줄을 쓰는 즉시 흘렸다. 템플릿을 섞지 않는다(빈 칸만 끝에 채운다)
    type Shown = "none" | "template" | "streamed";
    // 훅(콜백) 안에서 바뀐다 — 선언 타입으로 고정해 TS 가 "none" 으로 좁히지 않게
    let shown = "none" as Shown;
    const kept: Record<ExplainSection, string[]> = { modeReasoning: [], keyDrivers: [], risks: [], newsSummary: [] };
    let streamDropped = 0;

    const showTemplate = () => {
      if (shown !== "none") return;
      shown = "template";
      send({ event: "message.step", data: { step: "draft", status: "active" } });
      sentencesOf(template.modeReasoning).forEach((text) =>
        send({ event: "message.delta", data: { section: "modeReasoning", index: 0, text } })
      );
      (["keyDrivers", "risks", "newsSummary"] as const).forEach((section) =>
        template[section].forEach((text, index) => send({ event: "message.delta", data: { section, index, text } }))
      );
      send({ event: "message.step", data: { step: "draft", status: "done" } });
      send({ event: "message.step", data: { step: "polish", status: "active" } });
    };

    /**
     * 줄 하나 = 문장 하나(`SRV-REQ-050` FR-13). 검사(`guardExplanationLine` — 끝 검사와 같은 사실 · 극성)를 통과하면
     * **바로** 흘린다. LLM 원문은 여전히 검사 전엔 나가지 않는다(FR-47). 템플릿이 먼저 나갔으면 줄은 모으기만 한다
     */
    const hooks: ExplainHooks = {
      onProvider: (provider, streaming) => {
        if (shown !== "none") return;
        if (!streaming) return showTemplate();
        send({ event: "message.step", data: { step: "draft", status: "skipped" } });
        send({ event: "message.step", data: { step: "polish", status: "active", provider } });
        // 줄마다 검사가 같이 돈다 — 실제로 하는 일이라 같이 켠다(가짜 단계 아님, FR-61)
        send({ event: "message.step", data: { step: "verify", status: "active" } });
      },
      onLine: ({ section, text }) => {
        if (shown === "template") return;
        if (!guardExplanationLine(section, text, input).ok) {
          streamDropped += 1;
          return;
        }
        shown = "streamed";
        const index = section === "modeReasoning" ? 0 : kept[section].length;
        const piece = section === "modeReasoning" && kept.modeReasoning.length > 0 ? ` ${text}` : text;
        kept[section].push(text);
        send({ event: "message.delta", data: { section, index, text: piece } });
      },
    };

    const result = await this.callExplainer(userId, request, input, signal, hooks).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error })
    );
    if (signal?.aborted) return;

    let source: ExplanationSource = "template";
    let dropped = 0;
    let provider: ExplainProvider | null = null;

    if (shown === "streamed") {
      // 흘린 문장이 최종이다. 판단 줄이 하나도 안 남았거나 칸이 비면 그 칸만 템플릿 → `replace` 한 번
      const completed = completeExplanation(kept, input, now);
      dropped = streamDropped;
      source = dropped > 0 || completed.filled.length > 0 ? "llm_checked" : "llm";
      provider = result.ok ? (result.value.provider ?? null) : null;
      // 중간에 끊긴 로컬 CLI 가 Gemini 로 내려가 성공했어도, 화면엔 이미 앞 공급자 문장이 있다 — 섞지 않는다
      if (result.ok) this.markDropped(result.value, dropped);
      send({ event: "message.step", data: { step: "polish", status: "done" } });
      send({ event: "message.step", data: { step: "verify", status: "done" } });
      if (completed.filled.length > 0) {
        const { modeReasoning, keyDrivers, risks, newsSummary } = completed.explanation;
        send({
          event: "message.replace",
          data: { modeReasoning, keyDrivers, risks, newsSummary, source, droppedSentences: dropped, provider },
        });
      }
    } else if (result.ok) {
      // 스트리밍 못 하는 공급자 · 줄이 다 걸린 경우 — 통째 검사 뒤 `replace`(예전 길)
      showTemplate();
      send({ event: "message.step", data: { step: "polish", status: "done" } });
      send({ event: "message.step", data: { step: "verify", status: "active" } });
      const verified = verifyExplanation(result.value, input, now);
      send({ event: "message.step", data: { step: "verify", status: "done" } });
      source = verified.source;
      dropped = verified.dropped.length + streamDropped;
      // 검사가 전부 버려 템플릿이 됐으면 공급자도 없다 — 화면에 보이는 문장을 쓴 쪽만 적는다
      provider = source === "template" ? null : (result.value.provider ?? null);
      this.markDropped(result.value, dropped);
      const { modeReasoning, keyDrivers, risks, newsSummary } = verified.explanation;
      send({
        event: "message.replace",
        data: { modeReasoning, keyDrivers, risks, newsSummary, source, droppedSentences: dropped, provider },
      });
    } else {
      // LLM 실패 — 템플릿이 최종 문장이다(아직 안 흘렸으면 지금). 원문 · 오류 본문은 싣지 않는다
      showTemplate();
      send({ event: "message.step", data: { step: "polish", status: "skipped" } });
      send({ event: "message.step", data: { step: "verify", status: "skipped" } });
    }

    send({
      event: "message.done",
      data: { messageId, source, droppedSentences: dropped, provider, generatedAt: now.toISOString() },
    });
  }

  /**
   * 3종 게이트 — 단건 · 스트림이 **같은 함수**로 판정한다(FR-50) — 그리고 **그 재료로** 해설 사실을 만든다(C01).
   * 게이트가 본 시세 · 지표 · 심리 · 대량 체결과 해설이 쓰는 것이 같은 객체다.
   *
   * 뉴스는 게이트와 나란히 부른다. 실패하면 뉴스 없이 간다 — 뉴스는 해설의 재료지 판단의 재료가 아니다.
   */
  private async prepare(
    userId: string,
    request: CoachExplainRequest
  ): Promise<
    | { ok: false; blockedReason: ExplainBlockedReason }
    | { ok: true; view: ModeCoachView; input: CoachExplanationInput; facts: ExplanationFactsRef }
  > {
    const symbol = request.symbol.toUpperCase();

    const [materialsBySymbol, holding, news] = await Promise.all([
      collectJudgmentMaterials(this.market, [symbol]),
      this.portfolio.getHolding(userId, symbol),
      this.news.recentForSymbol(symbol, EXPLANATION_NEWS_MAX).catch(() => []),
    ]);
    const materials = materialsBySymbol.get(symbol)!;
    const judged = judgeSymbol(symbol, materials, Boolean(holding));
    const decision = request.mode === "scalp" ? judged.scalp : judged.longTerm;
    // 종목 판단과 같은 막음 — 오래된 재료 · 국내 주식 단타 · 이력 · 국내 주식 표본(F010 슬라이스 7 · F011 슬라이스 4)
    const view = await attachJudgmentTrack(
      this.judgments,
      decision,
      materialGuards(materials, request.mode, this.now()),
      materials.assetClass,
      { backtest: this.options.backtestJudgments ?? null, market: this.market }
    );
    if (!view.renderable) return { ok: false, blockedReason: view.blockedReason! };

    const input = assembleExplanationFacts({
      symbol,
      mode: request.mode,
      quote: materials.quote,
      judgment: view.judgment,
      indicator: indicatorFor(materials, request.mode),
      sentiment: materials.sentiment,
      whale: {
        buyAmountKRW: judged.whaleBuy,
        sellAmountKRW: judged.whaleSell,
        count: materials.whales.length,
      },
      news,
    });
    if (!input) return { ok: false, blockedReason: "facts_unavailable" };

    return {
      ok: true,
      view,
      input,
      facts: { asOf: new Date().toISOString(), hash: explanationFactsHash(input) },
    };
  }

  /**
   * LLM 문장은 그대로 믿지 않는다 — 문장마다 말투 · 숫자를 검사하고 걸린 칸은 템플릿으로 채운다.
   * LLM 이 실패하면 전부 템플릿이다(중단은 제외 — 화면이 떠났으면 만들 이유가 없다).
   */
  private async polish(
    userId: string,
    request: CoachExplainRequest,
    input: CoachExplanationInput,
    signal?: AbortSignal
  ) {
    try {
      const llm = await this.callExplainer(userId, request, input, signal);
      const verified = verifyExplanation(llm, input, new Date());
      this.markDropped(llm, verified.dropped.length);
      return {
        ...verified,
        provider: verified.source === "template" ? null : (llm.provider ?? null),
      };
    } catch (error) {
      if (signal?.aborted) throw error;
      return {
        explanation: templateExplanation(input, new Date()),
        source: "template" as ExplanationSource,
        dropped: [] as unknown[],
        provider: null,
      };
    }
  }
}

import { randomUUID } from "node:crypto";

import {
  assembleExplanationFacts,
  EXPLANATION_NEWS_MAX,
  explanationFactsHash,
  templateExplanation,
  verifyExplanation,
  type ExplanationSource,
} from "../domain";
import type {
  CoachExplainer,
  CoachExplanation,
  CoachExplanationInput,
  CoachMode,
  JudgmentBlockedReason,
  MarketProbe,
  NewsProbe,
  PortfolioProbe,
  SymbolJudgmentStore,
} from "../domain";
import { collectJudgmentMaterials, judgeSymbol } from "./lib/judgeSymbols";
import {
  attachJudgmentTrack,
  JUDGMENT_DISCLAIMER,
  type ModeCoachView,
} from "./lib/judgmentTrack";

/** 해설 요청 — 종목과 관점뿐이다. 사실은 서버가 조립한다(C01 · `SRV-REQ-025` FR-58) */
export interface CoachExplainRequest {
  symbol: string;
  mode: CoachMode;
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
  | (CoachExplanation & {
      renderable: true;
      /**
       * 문장 출처(추가 필드, 2026-09-24). `llm` — 검증 통과 · `llm_checked` — 일부 문장을 걸러 템플릿으로 채움 ·
       * `template` — LLM 실패, 전부 템플릿. 화면은 `template` 에 "규칙 기반 설명" 배지를 단다(FEATURE-004 UX Degraded)
       */
      source: ExplanationSource;
      /** 걸러낸 문장 수(말투 · 지어낸 숫자). 관측용 */
      droppedSentences: number;
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

/** 인용 출처 — 해설에 들어간 뉴스의 출처(FEATURE-008 FR-44). 문장이 아니라 입력에서 온다 */
export interface ExplainCitation {
  title: string;
  source: string | null;
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
  | { event: "message.step"; data: { step: ExplainStep; status: "active" | "done" | "skipped" } }
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
      data: Pick<CoachExplanation, ExplainSection> & { source: ExplanationSource; droppedSentences: number };
    }
  | {
      event: "message.done";
      data: { messageId: string; source: ExplanationSource; droppedSentences: number; generatedAt: string };
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
    private readonly news: NewsProbe
  ) {}

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

    const verified = await this.polish(input, signal);
    const explanation = verified.explanation;

    return {
      ...explanation,
      source: verified.source,
      droppedSentences: verified.dropped.length,
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
   * 스트림 해설 (FEATURE-008 FR-47 · FR-60 · FR-61).
   *
   * 템플릿 문장을 먼저 흘리고(기다리게 하지 않는다), LLM 은 **같은 시각에** 출발시켜 검증을 통과하면
   * `replace` 로 바꾼다. 단계 이벤트는 실제 작업 경계에서만 낸다. 끊기면(`signal`) 더 내지 않는다.
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
        citations: (input.news ?? []).map((n) => ({ title: n.title, source: n.source ?? null })),
        facts,
      },
    });

    // LLM 은 지금 출발한다 — 템플릿을 흘리는 동안 기다린다. 실패는 여기서 삼키고 아래에서 판정한다
    const llm = this.explainer.explain(input, signal).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error })
    );

    send({ event: "message.step", data: { step: "draft", status: "active" } });
    const now = new Date();
    const template = templateExplanation(input, now);
    sentencesOf(template.modeReasoning).forEach((text) =>
      send({ event: "message.delta", data: { section: "modeReasoning", index: 0, text } })
    );
    (["keyDrivers", "risks", "newsSummary"] as const).forEach((section) =>
      template[section].forEach((text, index) => send({ event: "message.delta", data: { section, index, text } }))
    );
    send({ event: "message.step", data: { step: "draft", status: "done" } });

    send({ event: "message.step", data: { step: "polish", status: "active" } });
    const result = await llm;
    if (signal?.aborted) return;

    let source: ExplanationSource = "template";
    let dropped = 0;
    if (result.ok) {
      send({ event: "message.step", data: { step: "polish", status: "done" } });
      send({ event: "message.step", data: { step: "verify", status: "active" } });
      const verified = verifyExplanation(result.value, input, now);
      send({ event: "message.step", data: { step: "verify", status: "done" } });
      source = verified.source;
      dropped = verified.dropped.length;
      const { modeReasoning, keyDrivers, risks, newsSummary } = verified.explanation;
      send({
        event: "message.replace",
        data: { modeReasoning, keyDrivers, risks, newsSummary, source, droppedSentences: dropped },
      });
    } else {
      // LLM 실패 — 이미 흘린 템플릿이 최종 문장이다. 원문 · 오류 본문은 싣지 않는다
      send({ event: "message.step", data: { step: "polish", status: "skipped" } });
      send({ event: "message.step", data: { step: "verify", status: "skipped" } });
    }

    send({
      event: "message.done",
      data: { messageId, source, droppedSentences: dropped, generatedAt: now.toISOString() },
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
    const view = await attachJudgmentTrack(this.judgments, decision);
    if (!view.renderable) return { ok: false, blockedReason: view.blockedReason! };

    const input = assembleExplanationFacts({
      symbol,
      mode: request.mode,
      quote: materials.quote,
      judgment: view.judgment,
      indicator: materials.indicator,
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
  private async polish(input: CoachExplanationInput, signal?: AbortSignal) {
    try {
      const llm = await this.explainer.explain(input, signal);
      return verifyExplanation(llm, input, new Date());
    } catch (error) {
      if (signal?.aborted) throw error;
      return {
        explanation: templateExplanation(input, new Date()),
        source: "template" as ExplanationSource,
        dropped: [] as unknown[],
      };
    }
  }
}

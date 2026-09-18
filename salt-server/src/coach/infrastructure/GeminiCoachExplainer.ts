import {
  GoogleGenerativeAI,
  type GenerationConfig,
} from "@google/generative-ai";

import { env } from "../../shared/config/env";
import type {
  CoachExplainer,
  CoachExplanation,
  CoachExplanationInput,
} from "../domain";

/**
 * LLM 해설 (Gemini) — `ai-coach-gemini-explainer.service` 에서 옮겨왔다.
 *
 * ## 문장만 만든다
 *
 * 숫자는 전부 **우리가 프롬프트에 주입**하고 모델은 그것을 설명한다
 * (`ddd-infrastructure.md` §6). 점수·판단·근거는 `domain/policy` 가 이미 정했고,
 * 이 호출이 실패해도 추천 자체는 나온다 — 해설만 없다.
 *
 * ## 트랜잭션 밖에서만 부른다
 *
 * 수 초~수십 초가 걸린다. 트랜잭션 안에서 부르면 그 시간 동안 커넥션과 락을 잡는다
 * (`performance-server.md` §2).
 *
 * ## 수익률 예측을 만들지 않는다
 *
 * 원문은 모델에게 `expectedReturn.lowPercent/highPercent` 를 요구했다. 공통 수용 기준 4
 * ("수익률 예측 0건")와 어긋나서 **프롬프트·스키마·응답 타입 셋 다에서 없앴다.**
 * 한 곳만 지우면 나머지가 그 필드를 되살린다.
 *
 * ## 원문 응답을 로그·예외에 싣지 않는다
 *
 * 원문은 파싱 실패 시 모델 응답 200자를 예외 메시지에 붙였다. 그 메시지는 그대로
 * 로그로 나가고, 같은 §6 이 금지하는 **원문 로깅**이 된다. 길이만 남긴다.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { value: CoachExplanation; expiresAt: number }>();

const SYSTEM_INSTRUCTION = `당신은 SALT 투자 코치입니다. 한국 개인 투자자에게 데이터 기반 해설을 제공합니다.

규칙:
1. 절대 수익을 보장하거나 "꼭 ~할 것이다" 같이 단언하지 마세요. 모든 표현은 확률·가능성 기반입니다.
2. 제공된 근거 데이터를 인용해 설명하세요. 데이터에 없는 내용은 추측하지 마세요.
3. 한국어 친근한 존댓말로 답하세요. ("~예요", "~해요" 톤).
4. 응답은 반드시 유효한 JSON 한 개만 출력하세요. 마크다운, 주석, 설명 텍스트 금지.
5. 매수/매도 직접 권유 금지. "이 모드가 왜 적합한지" 해설만 합니다.
6. **수익률·목표가를 예측하지 마세요.** "얼마가 될 것이다", "몇 % 오를 수 있다" 같은
   수치 전망을 쓰지 마세요. 관찰 기간(timeframe)만 말합니다.`;

const generationConfig: GenerationConfig = {
  temperature: 0.4,
  maxOutputTokens: 1200,
  responseMimeType: "application/json",
};

export class GeminiCoachExplainer implements CoachExplainer {
  private readonly client: GoogleGenerativeAI;

  constructor() {
    this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  async explain(input: CoachExplanationInput): Promise<CoachExplanation> {
    const key = this.cacheKey(input);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.value, cached: true };
    }

    const model = this.client.getGenerativeModel({
      model: env.GEMINI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig,
    });

    const response = await model.generateContent(this.buildPrompt(input));
    const parsed = this.parse(response.response.text());

    const result: CoachExplanation = {
      modeReasoning: String(parsed.modeReasoning ?? ""),
      timeframe: String(parsed.timeframe ?? ""),
      keyDrivers: Array.isArray(parsed.keyDrivers)
        ? parsed.keyDrivers.map(String)
        : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
      newsSummary: Array.isArray(parsed.newsSummary)
        ? parsed.newsSummary.map(String)
        : [],
      disclaimer: String(
        parsed.disclaimer ?? "투자 손실 가능. 본 해설은 의사결정 지원용입니다."
      ),
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    cache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  /** 가격이 조금 움직인 것으로 캐시가 깨지지 않게 버킷으로 묶는다. */
  private cacheKey(input: CoachExplanationInput): string {
    const priceBucket = Math.round(
      input.currentPrice / Math.max(1, input.currentPrice * 0.005)
    );
    const changeBucket = input.change24h.toFixed(1);
    const newsHash = (input.news ?? [])
      .slice(0, 5)
      .map((n) => n.title)
      .join("|")
      .slice(0, 60);

    return `${input.symbol}:${input.mode}:${priceBucket}:${changeBucket}:${newsHash}`;
  }

  private buildPrompt(input: CoachExplanationInput): string {
    const newsText = (input.news ?? [])
      .slice(0, 5)
      .map(
        (n, i) =>
          `${i + 1}. [${n.sentiment ?? "중립"}] ${n.title}${n.summary ? ` — ${n.summary}` : ""} (${n.source ?? "기타"})`
      )
      .join("\n");

    const evidence = input.evidence
      .map((e) => `- ${e.label}: ${e.value}`)
      .join("\n");

    const modeLabel = input.mode === "scalp" ? "단타 (스캘프)" : "장기 (long_term)";

    return [
      `종목: ${input.symbol} (${input.koreanName})`,
      `모드: ${modeLabel}`,
      `현재가: ${input.currentPrice.toLocaleString("ko-KR")}원`,
      `24시간 변동률: ${input.change24h.toFixed(2)}%`,
      `24시간 거래대금: ${Math.round(input.tradeValue24h / 1e8)}억원`,
      `판단 신뢰도: ${input.confidence}%`,
      "",
      "근거 데이터:",
      evidence || "- (제공된 근거 없음)",
      "",
      "관련 뉴스 (최근 5건):",
      newsText || "(뉴스 없음)",
      "",
      "다음 JSON 스키마에 맞춰 한 개의 JSON만 응답하세요:",
      JSON.stringify(
        {
          modeReasoning: `이 종목이 ${modeLabel} 모드에 적합한 이유를 2-3문장으로`,
          timeframe: input.mode === "scalp" ? "약 25분 이내" : "약 30일 내외",
          keyDrivers: ["주요 근거 1", "주요 근거 2", "주요 근거 3"],
          risks: ["주의해야 할 점 1", "주의해야 할 점 2"],
          newsSummary: ["뉴스 핵심 라인 1", "라인 2", "라인 3", "라인 4", "라인 5"],
          disclaimer: "투자 손실 가능 면책 문구",
        },
        null,
        2
      ),
    ].join("\n");
  }

  private parse(text: string): Record<string, any> {
    try {
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/```\s*$/, "")
        .trim();
      return JSON.parse(cleaned);
    } catch {
      throw new Error(`Gemini 응답 파싱 실패 (${text.length}자)`);
    }
  }
}

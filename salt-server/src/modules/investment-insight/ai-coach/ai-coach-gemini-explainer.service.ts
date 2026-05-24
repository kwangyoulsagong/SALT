import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import { env } from "../../../config/env";

export interface ExplainEvidenceItem {
  label: string;
  value: string;
}

export interface ExplainNewsItem {
  title: string;
  summary?: string;
  source?: string;
  sentiment?: string;
}

export interface ExplainInput {
  symbol: string;
  koreanName: string;
  mode: "scalp" | "long_term";
  currentPrice: number;
  change24h: number;
  tradeValue24h: number;
  confidence: number;
  evidence: ExplainEvidenceItem[];
  news?: ExplainNewsItem[];
}

export interface ExplainResult {
  modeReasoning: string;
  expectedReturn: {
    lowPercent: number;
    highPercent: number;
    timeframe: string;
    rationale: string;
  };
  keyDrivers: string[];
  risks: string[];
  newsSummary: string[];
  disclaimer: string;
  generatedAt: string;
  cached: boolean;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { value: ExplainResult; expiresAt: number }>();

const SYSTEM_INSTRUCTION = `당신은 SALT 투자 코치입니다. 한국 개인 투자자에게 데이터 기반 해설을 제공합니다.

규칙:
1. 절대 수익을 보장하거나 "꼭 ~할 것이다" 같이 단언하지 마세요. 모든 표현은 확률·가능성 기반입니다.
2. 제공된 근거 데이터를 인용해 설명하세요. 데이터에 없는 내용은 추측하지 마세요.
3. 한국어 친근한 존댓말로 답하세요. ("~예요", "~해요" 톤).
4. 응답은 반드시 유효한 JSON 한 개만 출력하세요. 마크다운, 주석, 설명 텍스트 금지.
5. 매수/매도 직접 권유 금지. "이 모드가 왜 적합한지" 해설만 합니다.
6. expectedReturn의 lowPercent/highPercent는 숫자만 (예: -5, 12).`;

const generationConfig: GenerationConfig = {
  temperature: 0.4,
  maxOutputTokens: 1200,
  responseMimeType: "application/json",
};

export class AICoachGeminiExplainerService {
  private client: GoogleGenerativeAI;

  constructor() {
    this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  async explain(input: ExplainInput): Promise<ExplainResult> {
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

    const prompt = this.buildPrompt(input);
    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const parsed = this.parse(text);

    const result: ExplainResult = {
      modeReasoning: String(parsed.modeReasoning ?? ""),
      expectedReturn: {
        lowPercent: Number(parsed.expectedReturn?.lowPercent ?? 0),
        highPercent: Number(parsed.expectedReturn?.highPercent ?? 0),
        timeframe: String(parsed.expectedReturn?.timeframe ?? ""),
        rationale: String(parsed.expectedReturn?.rationale ?? ""),
      },
      keyDrivers: Array.isArray(parsed.keyDrivers) ? parsed.keyDrivers.map(String) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
      newsSummary: Array.isArray(parsed.newsSummary) ? parsed.newsSummary.map(String) : [],
      disclaimer: String(parsed.disclaimer ?? "투자 손실 가능. 본 해설은 의사결정 지원용입니다."),
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    cache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  private cacheKey(input: ExplainInput): string {
    const priceBucket = Math.round(input.currentPrice / Math.max(1, input.currentPrice * 0.005));
    const changeBucket = input.change24h.toFixed(1);
    const newsHash = (input.news ?? []).slice(0, 5).map((n) => n.title).join("|").slice(0, 60);
    return `${input.symbol}:${input.mode}:${priceBucket}:${changeBucket}:${newsHash}`;
  }

  private buildPrompt(input: ExplainInput): string {
    const newsText = (input.news ?? [])
      .slice(0, 5)
      .map(
        (n, i) =>
          `${i + 1}. [${n.sentiment ?? "중립"}] ${n.title}${n.summary ? ` — ${n.summary}` : ""} (${n.source ?? "기타"})`
      )
      .join("\n");
    const evidence = input.evidence.map((e) => `- ${e.label}: ${e.value}`).join("\n");

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
          expectedReturn: {
            lowPercent: "예상 수익률 하단 숫자 (음수 가능, 예: -5)",
            highPercent: "예상 수익률 상단 숫자 (예: 12)",
            timeframe: input.mode === "scalp" ? "약 25분 이내" : "약 30일 내외",
            rationale: "범위 근거 1문장",
          },
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
      throw new Error("Gemini 응답 파싱 실패: " + text.slice(0, 200));
    }
  }
}

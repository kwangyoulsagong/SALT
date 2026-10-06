import {
  GoogleGenerativeAI,
  type GenerationConfig,
} from "@google/generative-ai";

import { logger } from "../../shared/config/logger";
import { env } from "../../shared/config/env";
import { isRetryableHttpError, withRetry } from "../../shared/infrastructure";
import type {
  CoachExplainer,
  CoachExplanation,
  CoachExplanationInput,
} from "../domain";
import {
  buildExplanationPrompt,
  EXPLANATION_RESPONSE_SCHEMA,
  EXPLANATION_SYSTEM_INSTRUCTION,
  explanationCacheKey,
  NEWS_SUMMARY_MAX,
  parseExplanationResponse,
} from "./explanationPrompt";

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
 *
 * ## 응답 모양은 스키마로 강제한다 (F010 슬라이스 6 · `SRV-REQ-025` FR-61)
 *
 * `responseSchema` 로 모델에게 모양을 주고, 받은 것을 Zod 로 다시 검사한다. 모양이 다르면 예외 —
 * 유스케이스가 템플릿 해설로 간다. 면책(`disclaimer`)은 받지 않는다 — 서버 상수다.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 호출 상한 — **타임아웃 20초 · 재시도 2회** (`ddd-infrastructure.md` §6 의 상한 3 안).
 *
 * 3 이 아니라 2 인 이유: 이 호출은 **사용자 요청이 동기로 기다리는 경로**이고
 * 예산이 6초다(`performance-server.md` §1). 20초 × 4회면 사용자가 80초를 기다린다.
 * 재시도는 429·5xx·타임아웃에만 걸고, 그 뒤로는 실패를 그대로 올린다 —
 * **해설이 없어도 추천은 나온다.**
 */
const REQUEST_TIMEOUT_MS = 20_000;
const RETRIES = 2;
const cache = new Map<string, { value: CoachExplanation; expiresAt: number }>();
/** 키가 입력 전체의 해시라 가격이 움직일 때마다 새 키다 — 만료된 것을 치우고 상한을 둔다 */
const CACHE_MAX = 500;

const rememberExplanation = (key: string, value: CoachExplanation) => {
  const now = Date.now();
  for (const [k, entry] of cache) if (entry.expiresAt <= now) cache.delete(k);
  // Map 은 넣은 순서를 지킨다 — 가장 오래된 것부터 버린다
  while (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
};

const generationConfig: GenerationConfig = {
  temperature: 0.4,
  maxOutputTokens: 1200,
  responseMimeType: "application/json",
  responseSchema: EXPLANATION_RESPONSE_SCHEMA,
};

export class GeminiCoachExplainer implements CoachExplainer {
  private readonly client: GoogleGenerativeAI;

  constructor() {
    this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  async explain(
    input: CoachExplanationInput,
    signal?: AbortSignal
  ): Promise<CoachExplanation> {
    const prompt = buildExplanationPrompt(input);
    const key = explanationCacheKey(env.GEMINI_MODEL, prompt);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.value, cached: true };
    }

    const model = this.client.getGenerativeModel(
      {
        model: env.GEMINI_MODEL,
        systemInstruction: EXPLANATION_SYSTEM_INSTRUCTION,
        generationConfig,
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    const response = await withRetry(() => model.generateContent(prompt, { signal }), {
      retries: RETRIES,
      baseDelayMs: 1_000,
      // 끊긴 요청은 다시 부르지 않는다 — 읽을 사람이 없다
      isRetryable: (error) => !signal?.aborted && isRetryableHttpError(error),
      // 프롬프트·응답은 싣지 않는다 (§ 원문 로깅 금지). 남기는 것은 횟수와 대기뿐이다.
      onRetry: (_error, attempt, waitMs) =>
        logger.warn(`Gemini 해설 재시도 ${attempt}회 (${waitMs}ms 후)`),
    });

    const text = response.response.text();
    const parsed = parseExplanationResponse(text);
    if (!parsed) throw new Error(`Gemini 응답 스키마 불일치 (${text.length}자)`);

    const result: CoachExplanation = {
      modeReasoning: parsed.modeReasoning,
      timeframe: parsed.timeframe ?? "",
      keyDrivers: parsed.keyDrivers,
      risks: parsed.risks,
      // 뉴스보다 많은 줄을 싣지 않는다 — 1건에 5줄이면 4줄은 모델이 지어낸 것이다(FR-51)
      newsSummary: parsed.newsSummary.slice(0, Math.min(NEWS_SUMMARY_MAX, (input.news ?? []).length)),
      // 면책은 서버 상수다(`JUDGMENT_DISCLAIMER`) — 유스케이스가 덮어쓴다. 모델에게 받지 않는다
      disclaimer: "",
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    rememberExplanation(key, result);
    return result;
  }
}

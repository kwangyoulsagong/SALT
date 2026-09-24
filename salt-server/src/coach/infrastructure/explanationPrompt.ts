import { createHash } from "node:crypto";

import { COACH_HORIZON, type CoachExplanationInput } from "../domain";

/**
 * Gemini 해설의 **입력** — 시스템 지시 · 프롬프트 · 캐시 키. env 를 읽지 않는 순수 모듈이다(테스트가 부른다).
 *
 * ## 캐시 키 = 모델이 받는 입력 전체의 해시 (F009 슬라이스 0 C02 · `SRV-REQ-025` FR-57)
 *
 * 예전 키는 가격을 0.5% 버킷으로 묶으려다 `round(price / (price × 0.005))` 가 되어 가격 200 이상이면
 * **늘 200** 이었다. 근거는 키에 없었고 뉴스는 제목 앞 60자뿐이었다 — 1억 원일 때 만든 해설이
 * 2억 원에도, 근거가 바뀐 뒤에도 나갔다.
 *
 * 이제 `모델 · 시스템 지시 · 프롬프트` 를 그대로 해시한다. 프롬프트에 가격 · 변동률 · 거래대금 · 근거 ·
 * 뉴스(제목 · 요약 · 출처 · 감성) · 기간이 다 들어가므로 **모델이 본 것이 하나라도 다르면 다른 키**다.
 * 프롬프트 문구를 고쳐도 키가 바뀐다 — 버전 번호를 따로 올릴 필요가 없다.
 * 서버 사실 스냅샷(C01)이 생기면 같은 스냅샷 안에서만 캐시가 맞는다.
 */

/** `SRV-REQ-025` FR-51 — 뉴스 요약 최대 줄 수. 입력 뉴스 수를 넘지 않는다 */
export const NEWS_SUMMARY_MAX = 5;

export const EXPLANATION_SYSTEM_INSTRUCTION = `당신은 SALT 투자 코치입니다. 한국 개인 투자자에게 데이터 기반 해설을 제공합니다.

규칙:
1. 절대 수익을 보장하거나 "꼭 ~할 것이다" 같이 단언하지 마세요. 모든 표현은 확률·가능성 기반입니다.
2. 제공된 근거 데이터를 인용해 설명하세요. 데이터에 없는 내용은 추측하지 마세요.
3. 한국어 친근한 존댓말로 답하세요. ("~예요", "~해요" 톤).
4. 응답은 반드시 유효한 JSON 한 개만 출력하세요. 마크다운, 주석, 설명 텍스트 금지.
5. 매수/매도 직접 권유 금지. "이 모드가 왜 적합한지" 해설만 합니다.
6. **수익률·목표가를 예측하지 마세요.** "얼마가 될 것이다", "몇 % 오를 수 있다" 같은
   수치 전망을 쓰지 마세요. 관찰 기간(timeframe)만 말합니다.`;

export const buildExplanationPrompt = (input: CoachExplanationInput): string => {
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
        timeframe: COACH_HORIZON[input.mode].phrase,
        keyDrivers: ["주요 근거 1", "주요 근거 2", "주요 근거 3"],
        risks: ["주의해야 할 점 1", "주의해야 할 점 2"],
        newsSummary: Array.from(
          { length: Math.min(NEWS_SUMMARY_MAX, (input.news ?? []).length) },
          (_, i) => `뉴스 ${i + 1} 핵심 한 줄`
        ),
        disclaimer: "투자 손실 가능 면책 문구",
      },
      null,
      2
    ),
  ].join("\n");
};

export const explanationCacheKey = (model: string, prompt: string): string =>
  createHash("sha256")
    .update(model)
    .update("\0")
    .update(EXPLANATION_SYSTEM_INSTRUCTION)
    .update("\0")
    .update(prompt)
    .digest("hex");

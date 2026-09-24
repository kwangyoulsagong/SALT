/**
 * 템플릿 해설 · LLM 해설 검증 — F008 `SRV-REQ-037` FR-7 · `FEATURE-008` FR-42 · FR-45.
 *
 * ## 템플릿이 바닥이다
 *
 * 해설 문장은 **입력 사실로만** 만든다(판단 한 줄 · 근거 · 주의 · 뉴스 제목). 숫자를 지어낼 자리가 없다.
 * LLM(`CoachExplainer`)이 켜져 있으면 LLM 문장을 쓰되, 문장마다 `languageGuard` 를 지나고
 * 떨어진 칸은 템플릿으로 채운다. LLM 이 실패하면 전부 템플릿이다 — 해설이 비지 않는다.
 *
 * 사용자 결정(2026-09-24): Gemini 는 지금 걷어내지 않는다. 그래서 LLM 이 1순위이고 이 파일은 검증 · 폴백이다.
 * 템플릿만 쓸지는 블라인드 비교(FEATURE-008 FR-49) 뒤에 정한다.
 */

import type { CoachExplanation, CoachExplanationInput } from "../ports";
import { COACH_HORIZON } from "./horizon";
import { guardSentences, numbersIn, type LanguageViolation } from "./languageGuard";

export type ExplanationSource = "llm" | "llm_checked" | "template";

const MODE_LABEL = { scalp: "단타", long_term: "장기" } as const;
const NEWS_MAX = 5;
/** 프롬프트 문구 자체에 있는 숫자 — "24시간 변동률" · "24시간 거래대금" · "최근 5건" */
const PROMPT_NUMBERS = [24, 5];

const firstValue = (input: CoachExplanationInput, keyword: string): string | undefined =>
  input.evidence.find((e) => e.label.includes(keyword))?.value;

const valuesOf = (input: CoachExplanationInput, keyword: string): string[] =>
  input.evidence.filter((e) => e.label.includes(keyword)).map((e) => e.value);

const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

/** 입력 사실만으로 만든 해설. 결정적이다 — 같은 입력이면 같은 문장. */
export const templateExplanation = (input: CoachExplanationInput, now: Date): CoachExplanation => {
  const headline = firstValue(input, "판단");
  const tradeValue = Math.round(input.tradeValue24h / 1e8);
  const modeReasoning = [
    headline ? `${MODE_LABEL[input.mode]} 관점 판단은 "${headline}"입니다.` : `${MODE_LABEL[input.mode]} 관점 판단입니다.`,
    `24시간 변동 ${signed(input.change24h)} · 거래대금 약 ${tradeValue.toLocaleString("ko-KR")}억 원 기준입니다.`,
  ].join(" ");

  const reasons = valuesOf(input, "근거");
  const keyDrivers = (reasons.length > 0
    ? reasons
    : input.evidence.filter((e) => !e.label.includes("판단") && !e.label.includes("주의")).map((e) => `${e.label}: ${e.value}`)
  ).slice(0, 3);

  const cautions = valuesOf(input, "주의").slice(0, 2);
  const risks = cautions.length > 0 ? cautions : ["가격 변동이 커질 수 있는 구간입니다."];

  const newsSummary = (input.news ?? [])
    .slice(0, NEWS_MAX)
    .map((n) => (n.source ? `${n.title} (${n.source})` : n.title));

  return {
    modeReasoning,
    timeframe: COACH_HORIZON[input.mode].phrase,
    keyDrivers,
    risks,
    newsSummary,
    disclaimer: "",
    generatedAt: now.toISOString(),
    cached: false,
  };
};

/** LLM 이 쓸 수 있는 숫자 — 입력에 있던 것만. 프롬프트가 보여 준 모양(억 단위 · 소수 2자리)도 포함한다. */
export const allowedNumbers = (input: CoachExplanationInput): number[] => {
  const texts = [
    ...input.evidence.flatMap((e) => [e.label, e.value]),
    ...(input.news ?? []).flatMap((n) => [n.title, n.summary ?? ""]),
    COACH_HORIZON[input.mode].phrase,
  ];
  return [
    ...PROMPT_NUMBERS,
    input.currentPrice,
    input.change24h,
    Math.round(input.tradeValue24h / 1e8),
    input.tradeValue24h / 1e8,
    ...texts.flatMap(numbersIn),
  ];
};

export interface VerifiedExplanation {
  explanation: CoachExplanation;
  source: ExplanationSource;
  dropped: { field: string; reasons: LanguageViolation[] }[];
}

/**
 * LLM 해설을 문장 단위로 검사한다. 떨어진 칸은 템플릿으로 채운다.
 *
 * - `modeReasoning` 은 한 덩어리 — 걸리면 통째로 템플릿
 * - `timeframe` 은 LLM 이 쓴 것을 버리고 `COACH_HORIZON` 을 주입한다(`SRV-REQ-024` FR-103 · C05) — 기간은 채점 기간 하나다
 * - 목록(근거 · 주의 · 뉴스)은 항목별 — 걸린 항목만 빼고, 다 빠지면 템플릿 목록
 */
export const verifyExplanation = (
  llm: CoachExplanation,
  input: CoachExplanationInput,
  now: Date
): VerifiedExplanation => {
  const allowed = allowedNumbers(input);
  const template = templateExplanation(input, now);
  const dropped: VerifiedExplanation["dropped"] = [];

  const single = (field: "modeReasoning"): string => {
    const r = guardSentences([llm[field]], allowed);
    if (r.kept.length === 1) return llm[field];
    dropped.push({ field, reasons: r.dropped[0]?.reasons ?? [] });
    return template[field];
  };
  const list = (field: "keyDrivers" | "risks" | "newsSummary"): string[] => {
    const r = guardSentences(llm[field], allowed);
    r.dropped.forEach((d) => dropped.push({ field, reasons: d.reasons }));
    return r.kept.length > 0 || llm[field].length === 0 ? r.kept : template[field];
  };

  const explanation: CoachExplanation = {
    ...llm,
    modeReasoning: single("modeReasoning"),
    timeframe: template.timeframe,
    keyDrivers: list("keyDrivers"),
    risks: list("risks"),
    newsSummary: list("newsSummary"),
  };
  return { explanation, source: dropped.length > 0 ? "llm_checked" : "llm", dropped };
};

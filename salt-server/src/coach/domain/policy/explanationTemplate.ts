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
import {
  fact,
  guardSentences,
  numericTokens,
  type LanguageViolation,
  type NumericFact,
} from "./languageGuard";

export type ExplanationSource = "llm" | "llm_checked" | "template";

const MODE_LABEL = { scalp: "단타", long_term: "장기" } as const;
const NEWS_MAX = 5;
/** 프롬프트 문구 자체에 있는 숫자 — 모델이 따라 써도 되는 표현이다(`explanationPrompt.ts`) */
const PROMPT_PHRASES = ["24시간 변동률", "24시간 거래대금", "최근 5건"];

const firstValue = (input: CoachExplanationInput, keyword: string): string | undefined =>
  input.evidence.find((e) => e.label.includes(keyword))?.value;

const valuesOf = (input: CoachExplanationInput, keyword: string): string[] =>
  input.evidence.filter((e) => e.label.includes(keyword)).map((e) => e.value);

const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

/** 입력 사실만으로 만든 해설. 결정적이다 — 같은 입력이면 같은 문장. */
export const templateExplanation = (input: CoachExplanationInput, now: Date): CoachExplanation => {
  const headline = firstValue(input, "판단");
  // 판단 문장을 그대로 앞에 둔다(2026-11-02). 전엔 `단타 관점 판단은 "…입니다. …못합니다."입니다.` 로 따옴표 안에 두 문장을 넣고
  // "입니다"를 또 붙였다 — 블라인드 평가지 · 실화면에서 어색했다(FEATURE-008 FR-49). 판단 문장은 이미 "<종목> <모드> 관점은 …"으로 시작한다.
  // ~~뒤에 "24시간 변동 · 거래대금 기준입니다."~~ 2026-11-13 뺐다(F017 v4 1f) — 4~6문장 상한 안에 들고, 오늘 등락은 원인 칸 '결과'가 말한다
  const modeReasoning = headline
    ? /[.!?]$/.test(headline.trim())
      ? headline.trim()
      : `${headline.trim()}.`
    : `${MODE_LABEL[input.mode]} 관점 판단입니다.`;

  const reasons = valuesOf(input, "근거");
  const keyDrivers = (reasons.length > 0
    ? reasons
    : input.evidence.filter((e) => !e.label.includes("판단") && !e.label.includes("주의")).map((e) => `${e.label}: ${e.value}`)
    // 결론 2 + 근거 2 + 주의 1 + 소식 1 = 6 — 사실표 문장도 LLM 과 같은 상한(`EXPLANATION_TOTAL_CAP`)
  ).slice(0, 2);

  const cautions = valuesOf(input, "주의").slice(0, EXPLANATION_SECTION_CAP.risks);
  // 규칙이 준 주의가 없으면 그 사실을 말한다(2026-11-02). 전엔 "가격 변동이 커질 수 있는 구간입니다."를 끼워 넣었는데,
  // 입력에 없는 일반론이라 블라인드 평가자 셋이 2차에서 근거 없는 문장으로 짚었다(FEATURE-008 FR-49)
  const risks = cautions.length > 0 ? cautions : ["이 판단에 규칙이 적은 주의 사항은 없습니다."];

  const newsSummary = (input.news ?? [])
    .slice(0, EXPLANATION_SECTION_CAP.newsSummary)
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

/**
 * LLM 이 쓸 수 있는 숫자 — 입력에 있던 사실만, **단위 · 방향과 함께**(C03).
 * 프롬프트가 보여 준 모양(억 단위 반올림 · 소수 2자리 변동률)도 같은 사실이다.
 *
 * ## 뉴스 속 숫자는 뉴스 칸에서만 (F010 슬라이스 6 · `SRV-REQ-025` FR-61)
 *
 * 2026-10-06 전에는 뉴스 제목 · 요약의 숫자가 **모든 칸의** 허용 숫자였다. 기사 제목의 "20% 급등 전망"이
 * 판단 근거 칸에 "20% 상승할 수 있어요"로 들어가도 통과했다 — 남의 전망이 이 종목의 사실처럼 나갔다.
 * 이제 `news: false`(판단 · 근거 · 주의 칸)는 시세 · 근거 사실만, `news: true`(뉴스 요약 칸)만 기사 숫자를 더 쓴다.
 */
export const allowedFacts = (input: CoachExplanationInput, scope: { news: boolean }): NumericFact[] => {
  const texts = [
    ...input.evidence.flatMap((e) => [e.label, e.value]),
    ...(scope.news ? (input.news ?? []).flatMap((n) => [n.title, n.summary ?? ""]) : []),
    // 원인 칸의 숫자(소식 뒤 30분 · 평소의 n배 · 오늘 등락) — 서버가 만든 사실이라 판단 · 근거 칸이 인용할 수 있다(F017 v4 1f)
    ...(input.cause
      ? [input.cause.headline, input.cause.note, input.cause.result, ...input.cause.evidence.flatMap((e) => [e.value, e.compare ?? ""])]
      : []),
    COACH_HORIZON[input.mode].phrase,
    ...PROMPT_PHRASES,
  ];
  // 금액(현재가 · 거래대금)은 크기다 — 방향이 없다. 부호를 박아 두면 "하락 구간에서도 거래대금 4200억원" 처럼
  // 근처의 방향 말이 금액에 음수를 붙여 맞는 숫자가 걸렸다(2026-11-02 로컬 Claude 실측, `SRV-REQ-050` FR-14).
  // 방향 대조는 변동률(%)에만 남긴다
  const magnitude = (value: number): NumericFact => ({ ...fact(value, "krw"), sign: null });
  return [
    magnitude(input.currentPrice),
    fact(input.change24h, "percent"),
    magnitude(input.tradeValue24h),
    magnitude(Math.round(input.tradeValue24h / 1e8) * 1e8),
    ...texts.flatMap(numericTokens),
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
 * - `modeReasoning` 은 문장 단위 — 걸린 문장만 빼고, 다 빠지면 템플릿(`SRV-REQ-050` FR-14, 예전엔 통째)
 * - `timeframe` 은 LLM 이 쓴 것을 버리고 `COACH_HORIZON` 을 주입한다(`SRV-REQ-024` FR-103 · C05) — 기간은 채점 기간 하나다
 * - 목록(근거 · 주의 · 뉴스)은 항목별 — 걸린 항목만 빼고, 다 빠지면 템플릿 목록
 * - 판단 극성(`input.stance`)은 판단 · 근거 칸에만 건다 — 주의 칸은 판단과 반대 방향을 말하는 것이 일이다
 */
export const verifyExplanation = (
  llm: CoachExplanation,
  input: CoachExplanationInput,
  now: Date
): VerifiedExplanation => {
  const template = templateExplanation(input, now);
  const dropped: VerifiedExplanation["dropped"] = [];
  // 스트림과 같은 문지기 — 사실 · 극성 · 칸 상한 · 되풀이를 문장마다(F017 v4 1f). 순서가 곧 화면 순서라 칸 순서대로 넣는다
  const gate = createLineGate(input);
  const pass = (field: ExplanationLineSection, sentences: readonly string[]): string[] =>
    sentences.flatMap((text) => {
      const r = gate(field, text);
      if (r.ok) return [text];
      dropped.push({ field, reasons: r.reasons });
      return [];
    });

  // 문장 단위(`SRV-REQ-050` FR-14) — 예전엔 한 덩어리라 한 문장만 걸려도 판단 문단 전체가 템플릿이 됐다.
  // 마침표 뒤에 공백 · 끝이 올 때만 문장 끝("+1.23%" 의 점에서 자르지 않는다)
  const reasoning = pass("modeReasoning", (llm.modeReasoning.match(/.+?[.!?](?=\s|$)|.+$/gs) ?? []).map((t) => t.trim()).filter(Boolean));
  const list = (field: "keyDrivers" | "risks" | "newsSummary"): string[] => {
    const kept = pass(field, llm[field]);
    return kept.length > 0 || llm[field].length === 0 ? kept : template[field];
  };

  const explanation: CoachExplanation = {
    ...llm,
    modeReasoning: reasoning.length > 0 ? reasoning.join(" ") : template.modeReasoning,
    timeframe: template.timeframe,
    keyDrivers: list("keyDrivers"),
    risks: list("risks"),
    newsSummary: list("newsSummary"),
  };
  return { explanation, source: dropped.length > 0 ? "llm_checked" : "llm", dropped };
};

/**
 * 칸마다 문장 상한 — 결론 2(판단 머리말이 두 문장이다) · 원인 → 근거 → 결과 3 · 조심할 점 1 · 소식 1, 그리고 **전체 6**
 * (F017 v4 1f · `SRV-REQ-053` FR-16 · `FE-REQ-064` FR-10 "문장 4~6개"). 칸 순서대로 세니 넘치면 뒤 칸(소식)부터 빠진다.
 * 화면이 자르지 않는다 — 서버가 정한다(보여 줄 대상은 서버)
 */
export const EXPLANATION_SECTION_CAP: Readonly<Record<ExplanationLineSection, number>> = {
  modeReasoning: 2,
  keyDrivers: 3,
  risks: 1,
  newsSummary: 1,
};
export const EXPLANATION_TOTAL_CAP = 6;

/** 같은 말 문턱 — 글자 두 개씩 묶은 조각의 겹침(Dice). 0.8 이상이면 되풀이 */
export const EXPLANATION_REPEAT_SIMILARITY = 0.8;

const bigrams = (text: string): Map<string, number> => {
  const t = text.replace(/[\s.,!?·~'"()]/g, "");
  const out = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    out.set(g, (out.get(g) ?? 0) + 1);
  }
  return out;
};

/** 두 문장의 겹침(0~1) — 순수 함수 */
export const sentenceSimilarity = (a: string, b: string): number => {
  const x = bigrams(a);
  const y = bigrams(b);
  const total = [...x.values()].reduce((s, n) => s + n, 0) + [...y.values()].reduce((s, n) => s + n, 0);
  if (total === 0) return a.trim() === b.trim() ? 1 : 0;
  let shared = 0;
  for (const [g, n] of x) shared += Math.min(n, y.get(g) ?? 0);
  return (2 * shared) / total;
};

/**
 * 줄 문지기 — 한 해설 생성 동안 상태(칸별 개수 · 앞서 통과한 문장)를 쥔다. 배치 검증(`verifyExplanation`)과 스트림이 **같은 함수**를 쓴다.
 * 사실 · 극성은 `guardExplanationLine`, 그 위에 칸 상한 · 되풀이
 */
export const createLineGate = (input: CoachExplanationInput) => {
  const counts: Record<ExplanationLineSection, number> = { modeReasoning: 0, keyDrivers: 0, risks: 0, newsSummary: 0 };
  const earlier: string[] = [];
  return (section: ExplanationLineSection, text: string): { ok: true } | { ok: false; reasons: LanguageViolation[] } => {
    const base = guardExplanationLine(section, text, input);
    if (!base.ok) return base;
    if (counts[section] >= EXPLANATION_SECTION_CAP[section] || earlier.length >= EXPLANATION_TOTAL_CAP) {
      return { ok: false, reasons: ["over_cap"] };
    }
    if (earlier.some((e) => sentenceSimilarity(e, text) >= EXPLANATION_REPEAT_SIMILARITY)) return { ok: false, reasons: ["repeated"] };
    counts[section] += 1;
    earlier.push(text);
    return { ok: true };
  };
};

/** 해설 칸 — 줄 단위 스트림이 어느 칸의 문장인지(`SRV-REQ-050` FR-13) */
export type ExplanationLineSection = "modeReasoning" | "keyDrivers" | "risks" | "newsSummary";

/**
 * 한 줄(한 문장) 검사 — 스트림이 문장 완성 즉시 흘릴지 정한다(FR-13). `verifyExplanation` 과 **같은 사실 · 같은 극성 규칙**이다:
 * 뉴스 칸만 기사 숫자를 쓰고, 극성은 판단 · 근거 칸에만 건다(주의 칸은 반대 방향을 말하는 것이 일이다)
 */
export const guardExplanationLine = (
  section: ExplanationLineSection,
  text: string,
  input: CoachExplanationInput
): { ok: true } | { ok: false; reasons: LanguageViolation[] } => {
  const facts = allowedFacts(input, { news: section === "newsSummary" });
  const stance = section === "modeReasoning" || section === "keyDrivers" ? input.stance : undefined;
  const r = guardSentences([text], facts, stance);
  return r.kept.length === 1 ? { ok: true } : { ok: false, reasons: r.dropped[0]?.reasons ?? [] };
};

/**
 * 줄 단위로 통과한 문장을 해설 한 벌로 묶는다. 빈 칸은 템플릿 — `verifyExplanation` 의 "다 빠지면 템플릿" 과 같다.
 * `filled` 는 템플릿으로 채운 칸 — 스트림이 마지막에 `replace` 를 보낼지 정한다
 */
export const completeExplanation = (
  kept: Record<ExplanationLineSection, string[]>,
  input: CoachExplanationInput,
  now: Date
): { explanation: CoachExplanation; filled: ExplanationLineSection[] } => {
  const template = templateExplanation(input, now);
  const filled: ExplanationLineSection[] = [];
  const pick = (section: Exclude<ExplanationLineSection, "modeReasoning">): string[] => {
    if (kept[section].length > 0) return kept[section];
    // 뉴스가 없으면 뉴스 칸이 비는 것이 맞다 — 채운 것으로 세지 않는다
    if (template[section].length > 0) filled.push(section);
    return template[section];
  };
  const modeReasoning = kept.modeReasoning.length > 0 ? kept.modeReasoning.join(" ") : template.modeReasoning;
  if (kept.modeReasoning.length === 0) filled.push("modeReasoning");
  return {
    explanation: {
      ...template,
      modeReasoning,
      keyDrivers: pick("keyDrivers"),
      risks: pick("risks"),
      newsSummary: pick("newsSummary"),
    },
    filled,
  };
};

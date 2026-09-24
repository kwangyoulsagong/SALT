/**
 * 말투 · 숫자 검증기 — F008 `SRV-REQ-037` FR-7 · `FEATURE-008` FR-42 · FR-43 · 공통 수용 기준 4.
 *
 * 사용자에게 가는 문장을 **문장 단위로** 검사한다. 규칙 문장(우리가 쓴 것)과 LLM 문장 둘 다 같은 검사를
 * 지난다 — 2026-09-24 전에는 LLM 출력에 런타임 검사가 없었고(프롬프트 규칙뿐), 우리 규칙 문장에도
 * "분할 매수를 고려하세요" 같은 명령형 매매 지시가 있었다.
 *
 * - **확신 표현**: 확실 · 무조건 · 보장 · 100% · 틀림없 · 반드시 오른/내린
 * - **명령형 매매 지시**: 매수 · 매도 · 진입 · 청산 · 손절 · 익절 · 비중 조절 + 명령 어미(하세요 · 고려하세요 · 검토하세요 …),
 *   "사세요 · 파세요 · 팔아야 · 사야"
 * - **한 점 목표가**: 목표가 · 목표 주가 · 목표 가격
 * - **지어낸 숫자**: 문장 속 숫자가 허용 숫자(입력에서 온 것)에 없으면 — LLM 문장에만 건다
 */

export type LanguageViolation = "certainty" | "imperative_trade" | "target_price" | "unverified_number";

// "보장하지 않습니다"는 면책이다 — 부정형은 통과시킨다
const CERTAINTY = /(확실|무조건|보장(?!\s*(하지|되지|할\s*수\s*없))|100\s*%|틀림없|반드시\s*(오|내|상승|하락))/;
const TRADE_VERB = "(매수|매도|진입|청산|손절|익절|물타기|비중\\s*(확대|축소|조절|재조정)|차익\\s*실현|리밸런싱)";
const IMPERATIVE = "(하세요|하십시오|해\\s*보세요|하라|고려하세요|검토하세요|추천합니다|권합니다|해야\\s*합니다)";
const IMPERATIVE_TRADE = new RegExp(`${TRADE_VERB}[^.。!?\\n]{0,14}${IMPERATIVE}|(사세요|파세요|팔아야|사야\\s*합니다|사\\s*두세요|팔\\s*때입니다)`);
const TARGET_PRICE = /(목표\s*(주)?가|목표\s*가격)/;

export const languageViolations = (sentence: string): LanguageViolation[] => {
  const out: LanguageViolation[] = [];
  if (CERTAINTY.test(sentence)) out.push("certainty");
  if (IMPERATIVE_TRADE.test(sentence)) out.push("imperative_trade");
  if (TARGET_PRICE.test(sentence)) out.push("target_price");
  return out;
};

/** 문장 속 숫자(쉼표 · 소수 · 부호 포함). "1,234.5억" → 1234.5 */
export const numbersIn = (sentence: string): number[] =>
  Array.from(sentence.matchAll(/[-−+]?\d[\d,]*(?:\.\d+)?/g), (m) =>
    Number(m[0].replace(/,/g, "").replace("−", "-"))
  ).filter((n) => Number.isFinite(n));

/** 세는 말 · 순서(1~12)는 사실 주장이 아니다 — "두 가지", "3개 요인", "1차 익절" */
const SMALL_COUNT_MAX = 12;

/**
 * 허용 숫자와 맞는가. 반올림을 허용한다 — 입력 2.34% 를 "2.3%" 로 쓰는 것은 같은 사실이다.
 * 부호는 무시한다("−2.3%" 와 "2.3% 하락").
 */
export const isAllowedNumber = (value: number, allowed: readonly number[]): boolean => {
  const v = Math.abs(value);
  if (Number.isInteger(v) && v <= SMALL_COUNT_MAX) return true;
  return allowed.some((a) => {
    const x = Math.abs(a);
    return Math.abs(v - x) <= Math.max(0.051, 0.02 * x);
  });
};

export interface GuardResult {
  kept: string[];
  dropped: { sentence: string; reasons: LanguageViolation[] }[];
}

/**
 * 문장 목록을 검사해 통과한 것만 남긴다. `allowedNumbers` 를 주면 숫자도 대조한다(LLM 문장).
 * 우리 규칙 문장은 숫자를 우리가 넣으므로 숫자 대조 없이 말투만 본다.
 */
export const guardSentences = (sentences: readonly string[], allowedNumbers?: readonly number[]): GuardResult => {
  const kept: string[] = [];
  const dropped: GuardResult["dropped"] = [];
  for (const sentence of sentences) {
    const reasons = languageViolations(sentence);
    if (allowedNumbers && numbersIn(sentence).some((n) => !isAllowedNumber(n, allowedNumbers))) {
      reasons.push("unverified_number");
    }
    if (reasons.length === 0) kept.push(sentence);
    else dropped.push({ sentence, reasons });
  }
  return { kept, dropped };
};

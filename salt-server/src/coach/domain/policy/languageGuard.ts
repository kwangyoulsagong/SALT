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
 * - **지어낸 숫자**: 문장 속 숫자가 입력 사실과 값 · 단위 · 방향으로 맞지 않으면 — LLM 문장에만 건다(아래 C03)
 * - **근거 없는 인과**: "~해서 · 때문에 · 영향으로" 인데 사실과 맞은 숫자가 없으면 — LLM 문장에만 건다
 * - **판단과 반대 극성**: 판단이 관망 · 피하기인데 "매수 적기 · 오를 가능성이 높" — LLM 문장에만 건다(F010 슬라이스 6 · `SRV-REQ-025` FR-61)
 *
 * ## 영어도 같은 검사를 지난다 (F010 슬라이스 6)
 *
 * 뉴스 피드 일부가 영어라 모델이 영어 문장을 섞어 쓴다. 2026-10-06 전에는 정규식이 한국어뿐이라
 * "Strong buy — guaranteed upside" 가 그대로 나갔다.
 */

export type LanguageViolation =
  | "certainty"
  | "imperative_trade"
  | "target_price"
  | "unverified_number"
  | "unsupported_causal"
  | "judgment_polarity";

// "보장하지 않습니다"는 면책이다 — 부정형은 통과시킨다
const CERTAINTY = /(확실|무조건|보장(?!\s*(하지|되지|할\s*수\s*없))|100\s*%|틀림없|반드시\s*(오|내|상승|하락))/;
const TRADE_VERB = "(매수|매도|진입|청산|손절|익절|물타기|비중\\s*(확대|축소|조절|재조정)|차익\\s*실현|리밸런싱)";
const IMPERATIVE = "(하세요|하십시오|해\\s*보세요|하라|고려하세요|검토하세요|추천합니다|권합니다|해야\\s*합니다)";
const IMPERATIVE_TRADE = new RegExp(`${TRADE_VERB}[^.。!?\\n]{0,14}${IMPERATIVE}|(사세요|파세요|팔아야|사야\\s*합니다|사\\s*두세요|팔\\s*때입니다)`);
const TARGET_PRICE = /(목표\s*(주)?가|목표\s*가격)/;

// 영어 — 부정형("not guaranteed")은 면책이라 통과시킨다
const CERTAINTY_EN = /(?<!not\s)\b(guaranteed?|definitely|certainly|risk[- ]free|can(?:no|')t\s+lose|sure\s+thing|100\s*%\s*(sure|certain))\b/i;
const IMPERATIVE_TRADE_EN =
  /\b(buy|sell|short|dump|load\s+up\s+on)\s+(it\s+)?(now|today|immediately|this)\b|\byou\s+(should|must|need\s+to)\s+(buy|sell|exit|enter)\b|\b(strong\s+(buy|sell)|go\s+all[- ]in)\b/i;
const TARGET_PRICE_EN = /\b(price\s+target|target\s+price)\b/i;
export const languageViolations = (sentence: string): LanguageViolation[] => {
  const out: LanguageViolation[] = [];
  if (CERTAINTY.test(sentence) || CERTAINTY_EN.test(sentence)) out.push("certainty");
  if (IMPERATIVE_TRADE.test(sentence) || IMPERATIVE_TRADE_EN.test(sentence)) out.push("imperative_trade");
  if (TARGET_PRICE.test(sentence) || TARGET_PRICE_EN.test(sentence)) out.push("target_price");
  return out;
};

/**
 * 판단의 방향 — 규칙이 정한 것(`ModeDecision.action`). 해설은 이 방향을 뒤집지 못한다.
 * `candidate` 는 기회 · 모아가기 후보, `wait` 는 관망, `avoid` 는 지금은 피하기.
 */
export type JudgmentStance = "candidate" | "wait" | "avoid";

// 앞을 내다보는 강세 · 약세 주장. 관찰("어제 3% 올랐어요")은 여기 걸리지 않는다 — 기대 · 가능성 · 전망 · 적기가 붙어야 한다.
// "가능성이 높" 만 잡던 첫 판은 실호출에서 관망 판단에 "향후 반등 가능성을 시사합니다"를 통과시켰다(2026-10-06) — 가능성 자체를 잡는다.
// 실호출 14건 · 50문장 점검(2026-10-06)에서 오탐 0, 놓침 1("장기적인 가치 상승 잠재력", 관망) — 잠재력을 더했다

const BULLISH = /(매수\s*(적기|기회|타이밍|하기\s*좋)|사기\s*좋|(상승|반등)(이|할|세가|의)?\s*(기대|가능성|여력|잠재력|전망|예상)|오를\s*(가능성|것)|강세(가|를)?\s*(전망|예상|기대)|bullish|upside\s+(ahead|potential))/i;
const BEARISH = /(매도\s*(적기|타이밍)|팔기\s*좋|(하락|조정)(이|할|세가|의)?\s*(가능성|위험이\s*(높|크)|전망|예상)|떨어질\s*(가능성|것)|약세(가|를)?\s*(전망|예상)|bearish|downside\s+(ahead|risk\s+is\s+high))/i;

/**
 * 문장이 판단과 반대 방향을 주장하는가. 관망 · 피하기 판단에 강세 전망을, 후보 판단에 약세 전망을 쓰면 위반이다.
 * 관망에 약세 전망은 반대가 아니다 — 관망은 방향을 말하지 않는다. 그 말이 틀렸으면 숫자 · 확신 검사가 잡는다.
 */
export const contradictsStance = (sentence: string, stance: JudgmentStance): boolean =>
  stance === "candidate" ? BEARISH.test(sentence) : BULLISH.test(sentence);

/** 문장 속 숫자(쉼표 · 소수 · 부호 포함). "1,234.5억" → 1234.5 — 단위를 버린다. 대조에는 `numericTokens` 를 쓴다 */
export const numbersIn = (sentence: string): number[] =>
  Array.from(sentence.matchAll(/[-−+]?\d[\d,]*(?:\.\d+)?/g), (m) =>
    Number(m[0].replace(/,/g, "").replace("−", "-"))
  ).filter((n) => Number.isFinite(n));

/**
 * ## 숫자는 값 · 단위 · 방향으로 대조한다 (F009 슬라이스 0 C03 · `SRV-REQ-037` FR-7 개정)
 *
 * 2026-09-24 전의 대조는 **절댓값 집합**이었다. 그래서 막지 못했다:
 *
 * | 입력 | 문장 | 옛 검사 | 이제 |
 * |---|---|---|---|
 * | 없음 | 수익률은 12%예요 | 통과(1~12 는 무조건) | 막음 — 세는 말이 붙을 때만 작은 수를 허용 |
 * | −20 | 가격이 20% 상승했어요 | 통과(부호 무시) | 막음 — 방향이 반대 |
 * | 없음 | 금리가 상승해서 가격이 하락했어요 | 통과(숫자 없음) | 막음 — 근거 숫자 없는 인과 주장 |
 * | RSI 31 | 31% 올랐어요 | 통과 | 막음 — 단위가 다르다 |
 *
 * **지표 이름(metricId)은 아직 대조하지 않는다.** 근거가 요청 본문의 자유 문자열이라 "RSI 31" 의 31 이
 * RSI 라는 것을 구조로 알 수 없다. 서버 사실 스냅샷(C01)이 사실을 구조로 주면 그때 더한다.
 */

/** 원 · 억 · 만은 전부 원(`krw`)으로 환산한다 — "1억 1,565만 원" 과 115,650,000 이 같은 사실이다 */
export type FactUnit = "percent" | "krw" | "ratio" | "hour" | "day" | "week" | "month" | "year" | "count" | "point" | "none";

export interface NumericFact {
  /** 절댓값 */
  value: number;
  unit: FactUnit;
  /** 방향. 알 수 없으면 `null`, 0 이면 `0` */
  sign: -1 | 0 | 1 | null;
}

const UNIT_OF: Record<string, FactUnit> = {
  "%": "percent", "%p": "point", 퍼센트: "percent", 원: "krw", 배: "ratio",
  시간: "hour", 일: "day", 주: "week", 개월: "month", 년: "year",
  가지: "count", 개: "count", 차: "count", 번째: "count", 단계: "count", 곳: "count",
  명: "count", 회: "count", 줄: "count", 건: "count", 위: "count",
  포인트: "point", 점: "point",
};

// 부호는 숫자 앞이 경계일 때만 — "2026-09-24" 의 "-09" 는 부호가 아니다
const TOKEN =
  /(?<![\d.,])([-−+](?=\d))?(\d[\d,]*(?:\.\d+)?)(?:\s?(억)(?:\s?(\d[\d,]*(?:\.\d+)?)\s?만)?|\s?(만))?\s?(%p|%|퍼센트|원|배|시간|개월|번째|가지|단계|포인트|년|일|주|개|차|곳|명|회|줄|건|위|점)?/g;

const UP = /(상승|올라|올랐|오른|오르|증가|늘어|늘었|반등|급등|플러스)/;
const DOWN = /(하락|내려|내렸|내린|떨어|감소|줄어|줄었|급락|마이너스|빠졌|빠진)/;

const directionNear = (text: string, start: number, end: number): -1 | 1 | null => {
  const window = text.slice(Math.max(0, start - 6), end + 10);
  const up = UP.test(window);
  const down = DOWN.test(window);
  return up === down ? null : up ? 1 : -1;
};

const num = (raw: string) => Number(raw.replace(/,/g, ""));

/** 문장 속 숫자를 값 · 단위 · 방향과 함께 뽑는다 */
export const numericTokens = (text: string): NumericFact[] =>
  Array.from(text.matchAll(TOKEN), (m) => {
    const [whole, signMark, a, eok, man, manOnly, unitWord] = m;
    let value = num(a!);
    let unit: FactUnit = unitWord ? UNIT_OF[unitWord]! : "none";
    if (eok) {
      value = value * 1e8 + (man ? num(man) * 1e4 : 0);
      unit = "krw";
    } else if (manOnly) {
      value *= 1e4;
      unit = "krw";
    }
    const explicit = signMark ? (signMark === "+" ? 1 : -1) : null;
    const sign: NumericFact["sign"] =
      value === 0 ? 0 : explicit ?? directionNear(text, m.index!, m.index! + whole.length);
    return { value, unit, sign };
  }).filter((t) => Number.isFinite(t.value));

/** 값 하나를 사실로 — 구조로 받은 숫자(현재가 · 변동률)용 */
export const fact = (value: number, unit: FactUnit): NumericFact => ({
  value: Math.abs(value),
  unit,
  sign: value === 0 ? 0 : value > 0 ? 1 : -1,
});

/** 세는 말 · 순서(1~12)는 사실 주장이 아니다 — "두 가지", "3개 요인", "1차" */
const SMALL_COUNT_MAX = 12;

const unitsCompatible = (token: FactUnit, source: FactUnit): boolean =>
  token === source ||
  // 단위 없이 쓴 숫자는 값으로만 맞춘다. 점 · 포인트는 지수 값("RSI 31")과 같은 말이다
  token === "none" ||
  (token === "point" && source === "none");

/**
 * 사실과 맞는가. 반올림을 허용한다 — 입력 2.34% 를 "2.3%" 로 쓰는 것은 같은 사실이다.
 * **방향은 허용하지 않는다** — 둘 다 방향이 있고 다르면 다른 사실이다.
 */
export const isSupported = (token: NumericFact, facts: readonly NumericFact[]): boolean => {
  if (token.unit === "count" && Number.isInteger(token.value) && token.value <= SMALL_COUNT_MAX) return true;
  return facts.some(
    (f) =>
      unitsCompatible(token.unit, f.unit) &&
      Math.abs(token.value - f.value) <= Math.max(0.051, 0.02 * f.value) &&
      !(token.sign && f.sign && token.sign !== f.sign)
  );
};

/** 원인 → 결과를 말하는 연결. 근거 숫자 없이 쓰면 관찰이 아니라 추측이다 */
const CAUSAL = /(때문|탓에|덕분에|로\s*인해|영향으로|여파로|(오르|올라|내려|떨어|상승해|하락해|증가해|감소해|늘어|줄어)서)/;

export interface GuardResult {
  kept: string[];
  dropped: { sentence: string; reasons: LanguageViolation[] }[];
}

/**
 * 문장 목록을 검사해 통과한 것만 남긴다. `facts` 를 주면 숫자 · 인과도 대조한다(LLM 문장).
 * 우리 규칙 문장은 숫자를 우리가 넣으므로 숫자 대조 없이 말투만 본다. `stance` 를 주면 판단 극성도 대조한다.
 */
export const guardSentences = (
  sentences: readonly string[],
  facts?: readonly NumericFact[],
  stance?: JudgmentStance
): GuardResult => {
  const kept: string[] = [];
  const dropped: GuardResult["dropped"] = [];
  for (const sentence of sentences) {
    const reasons = languageViolations(sentence);
    if (facts) {
      const tokens = numericTokens(sentence);
      const supported = tokens.filter((t) => isSupported(t, facts));
      if (supported.length < tokens.length) reasons.push("unverified_number");
      // 세는 말만 있는 문장("두 가지 이유로")은 근거가 아니다 — 사실과 맞은 숫자가 있어야 한다
      const cited = supported.some((t) => t.unit !== "count" || t.value > SMALL_COUNT_MAX);
      if (CAUSAL.test(sentence) && !cited) reasons.push("unsupported_causal");
    }
    if (stance && contradictsStance(sentence, stance)) reasons.push("judgment_polarity");
    if (reasons.length === 0) kept.push(sentence);
    else dropped.push({ sentence, reasons });
  }
  return { kept, dropped };
};

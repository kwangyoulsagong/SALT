import { createHash } from "node:crypto";

import type { CoachMode } from "../model";
import type { CoachExplanation, CoachExplanationInput } from "../ports";
import { EXPLANATION_EVIDENCE_LABEL } from "./explanationFacts";
import type { ExplanationLineSection, ExplanationSource } from "./explanationTemplate";
import { COACH_HORIZON } from "./horizon";
import type { JudgmentObservation } from "./judgmentObservation";
import { fact, isSupported, numericTokens, type NumericFact } from "./languageGuard";
import { MODE_DECISION_RULE_VERSION, type ModeDecisionAction } from "./modeDecision";

/**
 * 해설 스냅샷 — 늘 보이는 해설 (F017 v2 단계 3 · `SRV-REQ-053` FR-3 · `DB-REQ-043` FR-1).
 *
 * ## 왜 미리 만드는가
 *
 * 예전엔 사람이 [해설 보기]를 누를 때 LLM 을 불렀다 — 누르기 전엔 빈 칸, 누르면 수 초 기다림, 로컬 CLI 는 허용 사용자만.
 * 해설은 **시장 층**이다(종목 · 모드마다 같은 문장 — 보유 · 사람과 무관, `FEATURE-017` D2). 그래서 배치가 종목 지문이
 * 바뀐 종목만 한 번 만들어 저장하고, 화면은 저장값만 읽는다(요청 경로 LLM 0 — 불변식 1). **정정 2026-11-13(F017 v4 1f · FR-9)**: 저장본이 없으면
 * 해설 스트림이 그 자리에서 만든다 — 지문당 생성 하나(배치와 같은 등록부) · 모두 같은 문장이라 사람마다 다른 LLM 호출은 여전히 0
 *
 * ## 4단 — 칸이 비지 않는다
 *
 * 최신 AI(지문 같음) → 이전 AI(같은 방향 · 너무 오래되지 않음, 만든 시각과 함께) → 사실표 문장(템플릿 — AI 표시 없음) →
 * "특이 소식 없음" + 규칙 판단 근거. 실패한 생성은 저장하지 않으니 이전 성공본이 남는다.
 */

/** 프롬프트(`explanationPrompt.ts`) · 검증기(`explanationTemplate.ts` `verifyExplanation`)가 바뀌면 올린다 — 지문이 바뀌어 다시 만든다 */
export const EXPLANATION_PROMPT_VERSION = "explain-prompt@3"; // @3 2026-11-14 — 회사 사정 재료(F017 v4 2b+ FR-16)
export const EXPLANATION_VERIFIER_VERSION = "explain-verifier@4"; // @4 2026-11-14 — 회사 사정 인용(③')

/** 지문에 넣는 뉴스 수 — 맨 위 몇 건이 바뀌면 다시 만든다(뒤쪽 순서 변화로 매번 다시 만들지 않게) */
export const EXPLANATION_FINGERPRINT_NEWS = 3;

/**
 * 이전 해설을 보여도 되는 나이 — 판단 기간과 같다(단타 24시간 · 장기 30일). 그보다 오래된 문장은 다른 판단 기간의 이야기다
 */
export const EXPLANATION_PREVIOUS_MAX_AGE_MS: Record<CoachMode, number> = {
  scalp: COACH_HORIZON.scalp.ms,
  long_term: COACH_HORIZON.long_term.ms,
};

/** 종목 · 모드당 남기는 스냅샷 수 — 이전 단(previous)은 맨 위 하나만 쓴다. 나머지는 대조용 */
export const EXPLANATION_SNAPSHOT_KEEP = 5;

/** 배치 한 회차의 생성 상한 — LLM 은 순서대로 하나씩(로컬 CLI 동시 상한을 다 쓰지 않게). 남은 종목은 다음 회차 */
export const EXPLANATION_BATCH_MAX_PER_RUN = 12;

export type ExplanationTier = "latest" | "previous" | "template" | "none";

/**
 * 해설 칸 — LLM 이 쓰는 넷(스트림 시절 줄 단위 칸과 같다) + 서버가 판단 블록 값으로 쓰는 둘(`track` 얼마나 믿을까 · `miss` 틀렸던 때,
 * F017 v4 순서 1c — `explanationPlain.ts`)
 */
export type ExplanationSection = ExplanationLineSection | "track" | "miss";

/** 문장이 기댄 사실 하나 — 화면은 번호 칩으로, 누르면 이 이름 · 시각 */
export interface ExplanationCitation {
  id: string;
  label: string;
  /** 사실의 시각(ISO). 시세 · 판단 = 만든 시각, 뉴스 = 게시 시각. 모르면 `null` */
  at: string | null;
  /** 뉴스 원문 주소(`http(s)` 만 — `citableUrl`). 없으면 `null` */
  url: string | null;
}

export interface ExplanationSentence {
  section: ExplanationSection;
  text: string;
  /** 늘 하나 이상 — 숫자 · 글이 맞는 사실, 없으면 규칙 판단(`judgment`) */
  citations: ExplanationCitation[];
}

/** 관측 항목이 문턱 어느 쪽에 있나 — 값이 조금 움직여도 같은 쪽이면 같은 지문 */
const observationSide = (o: JudgmentObservation): string => {
  if (o.missing || o.value === null) return "missing";
  if (o.value < o.lower) return "below";
  if (o.value > o.upper) return "above";
  return "inside";
};

export interface ExplanationFingerprintInput {
  mode: CoachMode;
  action: ModeDecisionAction;
  observations: readonly JudgmentObservation[];
  /** 판단 꼬리표 사유(`caveats[].reason`) — 재료 멈춤 · 표본 적음이 붙고 떨어지면 문장이 달라진다 */
  caveatReasons: readonly string[];
  /** 뉴스 제목 — 맨 위 `EXPLANATION_FINGERPRINT_NEWS` 건만 */
  newsTitles: readonly string[];
}

/**
 * 종목 지문 — **판단이 의미 있게 바뀌었을 때만** 바뀐다. 판정 · 관측이 문턱 어느 쪽인가 · 꼬리표 · 맨 위 뉴스 · 규칙 · 프롬프트 ·
 * 검증기 버전. 가격 · RSI 소수점은 넣지 않는다 — 넣으면 매 분 다시 만들고, 문장은 만든 시각을 같이 보인다
 */
export const explanationFingerprint = (input: ExplanationFingerprintInput): string =>
  createHash("sha256")
    .update(
      JSON.stringify([
        MODE_DECISION_RULE_VERSION,
        EXPLANATION_PROMPT_VERSION,
        EXPLANATION_VERIFIER_VERSION,
        input.mode,
        input.action,
        [...input.observations].map((o) => [o.item, observationSide(o)]).sort(),
        [...input.caveatReasons].sort(),
        input.newsTitles.slice(0, EXPLANATION_FINGERPRINT_NEWS),
      ])
    )
    .digest("hex");

interface CatalogFact extends ExplanationCitation {
  /** 뉴스 칸에서만 쓰는 사실인가 — 기사 숫자는 뉴스 칸에서만(`allowedFacts` 와 같은 선) */
  news: boolean;
  texts: string[];
  numbers: NumericFact[];
}

const EVIDENCE_ID: Record<string, { id: string; label: string }> = {
  [EXPLANATION_EVIDENCE_LABEL.judgment]: { id: "judgment", label: "규칙 판단" },
  [EXPLANATION_EVIDENCE_LABEL.rsi]: { id: "rsi", label: "RSI" },
  [EXPLANATION_EVIDENCE_LABEL.sentiment]: { id: "sentiment", label: "시장 심리" },
  [EXPLANATION_EVIDENCE_LABEL.whaleBuy]: { id: "whale", label: "대량 체결" },
  [EXPLANATION_EVIDENCE_LABEL.whaleSell]: { id: "whale", label: "대량 체결" },
};

/**
 * 사실표 — 해설 입력의 사실마다 id 를 붙인다. 문장의 인용은 이 표의 id 만 가리킨다(지어낸 출처 0).
 * 근거 · 주의는 순번 id(`reason-1`), 같은 이름의 대량 체결 둘은 한 사실이다
 */
export const explanationFactCatalog = (input: CoachExplanationInput, asOf: Date): CatalogFact[] => {
  const at = asOf.toISOString();
  const byId = new Map<string, CatalogFact>();
  const add = (f: CatalogFact) => {
    const prev = byId.get(f.id);
    if (prev) {
      prev.texts.push(...f.texts);
      prev.numbers.push(...f.numbers);
    } else byId.set(f.id, f);
  };
  const magnitude = (value: number): NumericFact => ({ ...fact(value, "krw"), sign: null });
  add({
    id: "quote",
    label: `${input.koreanName} 시세`,
    at,
    url: null,
    news: false,
    texts: [],
    numbers: [
      magnitude(input.currentPrice),
      fact(input.change24h, "percent"),
      magnitude(input.tradeValue24h),
      magnitude(Math.round(input.tradeValue24h / 1e8) * 1e8),
      // "24시간 변동 · 거래대금" 의 24시간은 시세의 창이다 — 판단 기간("판단 뒤 24시간")보다 먼저 맞춘다
      fact(24, "hour"),
    ],
  });
  let reason = 0;
  let risk = 0;
  for (const e of input.evidence) {
    const known = EVIDENCE_ID[e.label];
    const ref =
      known ??
      (e.label === EXPLANATION_EVIDENCE_LABEL.reason
        ? { id: `reason-${++reason}`, label: "규칙 근거" }
        : e.label === EXPLANATION_EVIDENCE_LABEL.risk
          ? { id: `risk-${++risk}`, label: "규칙 주의" }
          : { id: `fact-${e.label}`, label: e.label });
    add({
      ...ref,
      at,
      url: null,
      news: false,
      texts: [e.value],
      numbers: [...numericTokens(e.label), ...numericTokens(e.value)],
    });
  }
  // 판단 기간("판단 뒤 24시간")은 규칙 판단의 사실이다 — 문장이 그 기간을 말하면 판단을 인용한다
  const judgment = byId.get("judgment");
  if (judgment) {
    judgment.texts.push(COACH_HORIZON[input.mode].phrase);
    judgment.numbers.push(...numericTokens(COACH_HORIZON[input.mode].phrase));
  }
  // 원인 칸 근거(F017 v4 1f) — 출처 이름 그대로("수급" · "업종" · "9:42 공시"). 원인 문장이 그 숫자를 말하면 그 이름으로 인용
  (input.cause?.evidence ?? []).forEach((e, i) =>
    add({
      id: `cause-${i + 1}`,
      label: e.source,
      at,
      url: null,
      news: false,
      texts: [e.value, ...(e.compare ? [e.compare] : [])],
      numbers: [...numericTokens(e.value), ...numericTokens(e.compare ?? "")],
    })
  );
  if (input.cause) {
    add({ id: "cause-result", label: "시세", at, url: null, news: false, texts: [input.cause.result], numbers: numericTokens(input.cause.result) });
  }
  // 회사 사정(F017 v4 2b+) — 출처 이름 그대로("DART 공시" · 매체). 문장이 그 숫자를 말하면 그 이름으로 인용
  (input.company?.lines ?? []).forEach((l, i) =>
    add({ id: `company-${i + 1}`, label: l.source, at, url: null, news: false, texts: [l.text], numbers: numericTokens(l.text) })
  );
  (input.news ?? []).forEach((n, i) =>
    add({
      id: `news-${i + 1}`,
      label: n.source ?? "뉴스",
      at: n.publishedAt ?? null,
      url: n.url ?? null,
      news: true,
      texts: [n.title, ...(n.summary ? [n.summary] : [])],
      numbers: [...numericTokens(n.title), ...numericTokens(n.summary ?? "")],
    })
  );
  return [...byId.values()];
};

/** 두 글의 글자 두 개 묶음 겹침(작은 쪽 기준) — 뉴스 문장이 어느 기사를 말하는지 */
const bigramOverlap = (a: string, b: string): number => {
  const grams = (s: string) => {
    const t = s.replace(/\s+/g, "");
    const out = new Set<string>();
    for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
    return out;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let common = 0;
  for (const g of ga) if (gb.has(g)) common++;
  return common / Math.min(ga.size, gb.size);
};

/** 기사 문장이 그 기사라고 볼 겹침 — 템플릿 뉴스 줄은 제목 그대로라 1 에 가깝다 */
const NEWS_MATCH_MIN = 0.5;
const CITATIONS_MAX = 3;
const SMALL_COUNT_MAX = 12;

/**
 * 문장 하나의 인용 — ① 사실 글이 문장 안에 있거나 문장이 사실 글 안에 있음 ② 남은 숫자가 맞는 사실(검증기와 같은 대조)
 * ③ 뉴스 칸이면 제목이 가장 많이 겹치는 기사 ③' 회사 사정 사실과 글자가 겹치면 그 사실 ④ 아무것도 없으면 규칙 판단. 인용 없는 문장 0
 */
export const citeSentence = (
  section: ExplanationSection,
  text: string,
  catalog: readonly CatalogFact[]
): ExplanationCitation[] => {
  const usable = catalog.filter((f) => !f.news || section === "newsSummary");
  const hits = new Set<string>();
  const plain = text.trim();
  // ① 사실 글을 그대로 옮긴 부분 — 그 사실. 옮긴 글 안의 숫자는 ②에서 다른 사실에 다시 맞추지 않는다
  //   ("판단 뒤 24시간"의 24시간은 판단 기간이지 시세 창이 아니다 — 2026-11-11 실데이터)
  let rest = plain;
  for (const f of usable) {
    for (const t of f.texts) {
      if (t.length < 6) continue;
      if (plain.includes(t)) {
        hits.add(f.id);
        rest = rest.split(t).join(" ");
      } else if (t.includes(plain)) hits.add(f.id);
    }
  }
  // ② 숫자가 맞는 사실(검증기와 같은 대조) — 같은 숫자는 사실표 첫 사실 하나
  const tokens = numericTokens(rest).filter((t) => !(t.unit === "count" && t.value <= SMALL_COUNT_MAX));
  for (const token of tokens) {
    const f = usable.find((c) => isSupported(token, c.numbers));
    if (f) hits.add(f.id);
  }
  if (section === "newsSummary") {
    const best = usable
      .filter((f) => f.news)
      .map((f) => ({ f, score: Math.max(...f.texts.map((t) => bigramOverlap(plain, t))) }))
      .sort((a, b) => b.score - a.score)[0];
    if (best && best.score >= NEWS_MATCH_MIN) hits.add(best.f.id);
  }
  // ③' 회사 사정(F017 v4 2b+) — 숫자 없이 말을 바꿔 옮겨도 그 사실(공시 · 기사 이름)로. 뉴스와 같은 겹침 문턱 · 칸 무관
  //   (실측 2026-11-14: "기업설명회(IR) 개최 안내공시처럼…" 문장이 '규칙 판단'으로 인용됐다)
  const company = usable
    .filter((f) => f.id.startsWith("company-"))
    .map((f) => ({ f, score: Math.max(...f.texts.map((t) => bigramOverlap(plain, t))) }))
    .sort((a, b) => b.score - a.score)[0];
  if (company && company.score >= NEWS_MATCH_MIN) hits.add(company.f.id);
  if (hits.size === 0) {
    const fallback = catalog.find((f) => f.id === "judgment") ?? catalog[0];
    if (fallback) hits.add(fallback.id);
  }
  return catalog
    .filter((f) => hits.has(f.id))
    .slice(0, CITATIONS_MAX)
    .map(({ id, label, at, url }) => ({ id, label, at, url }));
};

/** 문장 끝에서 자른다 — 마침표 뒤에 공백 · 끝이 올 때만("+1.23%" 의 점에서 자르지 않는다) */
const splitSentences = (text: string): string[] =>
  (text.match(/.+?[.!?](?=\s|$)|.+$/gs) ?? []).map((t) => t.trim()).filter(Boolean);

/** 해설 칸 → 인용 붙은 문장 목록. 칸 순서 = 화면 순서(판단 → 근거 → 주의 → 뉴스) */
export const explanationSentences = (
  explanation: Pick<CoachExplanation, ExplanationLineSection>,
  catalog: readonly CatalogFact[]
): ExplanationSentence[] => {
  const rows: { section: ExplanationSection; text: string }[] = [
    ...splitSentences(explanation.modeReasoning).map((text) => ({ section: "modeReasoning" as const, text })),
    ...explanation.keyDrivers.map((text) => ({ section: "keyDrivers" as const, text })),
    ...explanation.risks.map((text) => ({ section: "risks" as const, text })),
    ...explanation.newsSummary.map((text) => ({ section: "newsSummary" as const, text })),
  ].filter((r) => r.text.trim().length > 0);
  return rows.map((r) => ({ ...r, text: r.text.trim(), citations: citeSentence(r.section, r.text, catalog) }));
};

/**
 * 마지막 단 — 사실표를 못 만들었을 때(현재가 없음). 규칙 판단 한 줄 · 근거를 그대로. 화면은 "특이 소식 없음"을 붙인다
 */
export const judgmentOnlySentences = (
  judgment: { headline: string; label: string; reasons: readonly string[] },
  asOf: Date
): ExplanationSentence[] => {
  const citation: ExplanationCitation = { id: "judgment", label: "규칙 판단", at: asOf.toISOString(), url: null };
  const headline = (judgment.headline || judgment.label).trim();
  return [
    ...(headline ? [{ section: "modeReasoning" as const, text: headline, citations: [citation] }] : []),
    ...judgment.reasons
      .map((r) => r.trim())
      .filter(Boolean)
      .map((text) => ({ section: "keyDrivers" as const, text, citations: [citation] })),
  ];
};

export interface StoredExplanationHead {
  fingerprint: string;
  action: string;
  generatedAt: Date;
  /** 만든 검증기 버전 — 이전 단은 지금 검증기로 만든 글만(아래) */
  verifier?: { verifierVersion: string };
}

/**
 * 어느 단을 보이나 — 경계 표 테스트(`explanationSnapshot.test.ts`).
 * 이전 해설은 **같은 방향 · 판단 기간 안**에서만: 판정이 관망 → 후보로 바뀌었는데 관망 문장을 보이면 판단 카드와 해설이 서로 다른 말을 한다.
 * **그리고 지금 검증기로 만든 글만**(F017 v4 1f) — 옛 검증기 글은 지금 규칙(4~6문장 · 되풀이 · 단계 이름)을 통과하지 않았다.
 * 프롬프트를 바꾼 직후 하루 상한에 걸리면 옛 20문장 해설이 '이전 AI'로 나갔다(2026-11-13 실측) — 사실표 문장으로 내려간다
 */
export const selectExplanationTier = (input: {
  mode: CoachMode;
  fingerprint: string;
  action: ModeDecisionAction;
  stored: StoredExplanationHead | null;
  factsAvailable: boolean;
  now: Date;
}): ExplanationTier => {
  const { stored } = input;
  if (stored && stored.fingerprint === input.fingerprint) return "latest";
  if (
    stored &&
    stored.action === input.action &&
    (stored.verifier === undefined || stored.verifier.verifierVersion === EXPLANATION_VERIFIER_VERSION) &&
    input.now.getTime() - stored.generatedAt.getTime() <= EXPLANATION_PREVIOUS_MAX_AGE_MS[input.mode]
  ) {
    return "previous";
  }
  return input.factsAvailable ? "template" : "none";
};

/** LLM 이 낸 문장 수 — 판단 칸은 문장 단위, 목록 칸은 항목 단위(검증기와 같은 단위) */
export const llmSentenceCount = (llm: Pick<CoachExplanation, ExplanationLineSection>): number =>
  splitSentences(llm.modeReasoning).length + llm.keyDrivers.length + llm.risks.length + llm.newsSummary.length;

/**
 * 생성 결과를 저장할까 — 검사를 통과한 LLM 문장이 **하나라도** 있어야 AI 해설이다. 전부 걸려 템플릿으로 채워진 생성은
 * `llm_checked` 로 나와도 저장하지 않는다(이전 성공본을 남긴다 — 2026-11-11 테스트가 잡음)
 */
export const isStorableExplanation = (
  source: ExplanationSource,
  kept: number
): source is "llm" | "llm_checked" => (source === "llm" || source === "llm_checked") && kept > 0;

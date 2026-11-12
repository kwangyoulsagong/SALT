import { createHash } from "node:crypto";

import { DomainError, ErrorKind } from "../../../shared/domain";
import { isSupported, languageViolations, numericTokens, type LanguageViolation, type NumericFact } from "./languageGuard";

/**
 * 오늘 등락 한 줄(③) — F016 단계 D · `SRV-REQ-052` · `ADR-009` §1 · §3.
 *
 * ## 무엇을 말하나
 *
 * ① 분해(시장 · 업종 · 종목 몫)와 ② 같은 날 사실(공시 · 기사 제목 · VI · 시장 조치 …)은 market 이 이미 만든다. ③은 ②의 항목만
 * `[n]` 으로 인용해 **같은 날 무엇이 있었는지** 한 문장으로 묶는다. 원인을 고르지 않는다 — "때문 · 영향으로 · 호재" 같은 말은
 * 해설(F017)보다 엄하게 막는다(근거 숫자가 있어도). 앞날 · 매매 지시도 0.
 *
 * ## 문장에 분해 숫자를 넣지 않는다
 *
 * ①이 바로 위에서 숫자를 보인다. 문장 숫자는 **인용한 사실의 글에 있는 것만**(나머지는 버림 — FR-3 "LLM 숫자 버림").
 * 그래서 지문은 사실 목록 + 조용함뿐이고, 장중 몫이 움직여도 다시 부르지 않는다.
 *
 * ## 조용한 날은 LLM 0
 *
 * 고유 몫이 작거나(아래 문턱) 인용할 사실이 없으면 서버 문장 하나(FR-2). 저장하지 않는다 — 요청 때 같은 규칙으로 정한다.
 */

export const MOVE_SUMMARY_PROMPT_VERSION = "move-summary-prompt@1";
export const MOVE_SUMMARY_VERIFIER_VERSION = "move-summary-verifier@1";

/** 조용한 날 서버 문장(FR-2) — AI 표시 없음 */
export const MOVE_SUMMARY_QUIET_TEXT = "종목만의 뚜렷한 소식은 찾지 못했어요";

/**
 * 조용함 문턱(서버 설정 — `FEATURE-016` FR-4 "고유 몫이 작으면(설정)").
 * 고유 몫이 1%p 미만이거나 오늘 등락의 30% 미만이면 "이 종목만의 일"이 아니다 —
 * 2026-11-06 서킷브레이커 날 삼성전자 −9.98% 중 고유 몫 약 −1.4%p(14%)는 시장의 날이었다(`ADR-009` §2)
 */
export const MOVE_SUMMARY_POLICY = {
  idioAbsMin: 1,
  idioShareMin: 0.3,
} as const;

/** 프롬프트에 넣는 사실 수 — 최신 순 상한(market 목록은 30). 지문도 이 범위만 본다 */
export const MOVE_SUMMARY_FACTS_MAX = 12;

/** 종목 · 거래일당 LLM 시도 상한(FR-6) — 새 사실이 계속 와도 하루 이만큼만 */
export const MOVE_SUMMARY_DAILY_ATTEMPTS = 4;

/** 배치 한 회차 LLM 시도 상한 — 해설 배치와 같은 워커를 나눠 쓴다 */
export const MOVE_SUMMARY_BATCH_MAX_PER_RUN = 6;

/** 한 문장 상한(국문 80자 안팎 — FR-4). 인용 표시를 빼고 센다 */
export const MOVE_SUMMARY_MAX_CHARS = 120;

export type MoveAsset = "kr" | "crypto";

export type MoveSummaryFactKind =
  | "news"
  | "disclosure"
  | "vi"
  | "market_action"
  | "halt"
  | "warning"
  | "flow"
  | "crypto_news"
  | "crypto_warning";

/** market 의 ② 한 줄 — coach 말로 옮긴 것(ACL) */
export interface MoveSummaryFact {
  id: string;
  kind: MoveSummaryFactKind;
  at: Date;
  source: string;
  /** 제목 원문 또는 사건 코드(`vi:static:2` · `circuit_breaker:1:down` · `halted` · `caution:PRICE_FLUCTUATIONS`) */
  title: string;
  value: number | null;
}

export interface MoveSummarySplit {
  total: number;
  market: number;
  sector: number | null;
  idio: number;
  method: "regression" | "market_adjusted" | "benchmark";
}

/** 카드 하나 — market `whyMoved` 응답을 coach 가 쓰는 칸만 */
export interface MoveCard {
  asset: MoveAsset;
  symbol: string;
  /** 거래일(KST `YYYY-MM-DD`) — market 이 정한 값 그대로 */
  date: string;
  show: boolean;
  split: MoveSummarySplit | null;
  facts: MoveSummaryFact[];
}

export type MoveQuietReason = "no_facts" | "small_idio";

/**
 * 조용한 날인가 — 경계 표 테스트(`moveSummary.test.ts`). 벤치마크(BTC)는 자기 자신이 시장이라 등락 전체를 고유 몫으로 본다
 */
export const moveQuietReason = (card: Pick<MoveCard, "split" | "facts">): MoveQuietReason | null => {
  if (card.facts.length === 0) return "no_facts";
  const split = card.split;
  if (!split) return null;
  const idio = split.method === "benchmark" ? split.total : split.idio;
  const abs = Math.abs(idio);
  if (abs < MOVE_SUMMARY_POLICY.idioAbsMin) return "small_idio";
  if (Math.abs(split.total) > 0 && abs / Math.abs(split.total) < MOVE_SUMMARY_POLICY.idioShareMin) return "small_idio";
  return null;
};

const STATE_TEXT: Record<string, string> = {
  caution: "투자주의 종목",
  warning: "투자경고 종목",
  danger: "투자위험 종목",
  attention: "투자유의 종목",
  administrative: "관리종목",
  liquidation: "정리매매 중",
  overheat: "단기과열 종목",
};
const HALT_TEXT: Record<string, string> = { paused: "매매 일시 정지", halted: "거래 정지" };

/**
 * 사실 → 프롬프트 글. 제목(시황 · 공시 · 기사)은 원문 그대로, 사건 코드는 화면(`whyMovedMessages`)과 같은 뜻의 문장.
 * 금액 · 발동가는 넣지 않는다 — 문장이 숫자를 옮길 자리를 줄인다(①과 사실 목록이 숫자를 보인다)
 */
export const moveFactText = (f: Pick<MoveSummaryFact, "kind" | "title" | "value">): string => {
  switch (f.kind) {
    case "news":
    case "disclosure":
    case "crypto_news":
      return f.title.trim();
    case "vi": {
      const kind = f.title.split(":")[1];
      return `변동성 완화장치(VI) 발동${kind === "static" ? "(정적)" : kind === "dynamic" ? "(동적)" : ""}`;
    }
    case "market_action": {
      const [kind, stage = "1", direction] = f.title.split(":");
      if (kind === "circuit_breaker") return `시장 전체 서킷브레이커 ${stage}단계 발동`;
      if (kind === "sidecar") return `시장 사이드카 발동(프로그램 ${direction === "down" ? "매도" : "매수"} 호가 정지)`;
      return "시장 조치";
    }
    case "halt":
      return HALT_TEXT[f.title] ?? "거래 정지";
    case "warning":
      return STATE_TEXT[f.title] ?? "시장 경보 종목";
    case "flow":
      return f.value === null ? "프로그램 매매" : f.value >= 0 ? "프로그램 순매수" : "프로그램 순매도";
    case "crypto_warning":
      return f.title === "warning" ? "거래소 유의 종목 지정" : "거래소 주의 표시";
  }
};

/** 프롬프트에 들어가는 사실 — 번호는 1부터, 시각 오름차순(먼저 있었던 일이 앞) */
export interface MoveSummaryPromptFact {
  n: number;
  id: string;
  kind: MoveSummaryFactKind;
  at: Date;
  source: string;
  text: string;
}

/** 최신 `MOVE_SUMMARY_FACTS_MAX` 건 → 시각 오름차순 번호 */
export const moveSummaryPromptFacts = (facts: readonly MoveSummaryFact[]): MoveSummaryPromptFact[] =>
  [...facts]
    .sort((a, b) => b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id))
    .slice(0, MOVE_SUMMARY_FACTS_MAX)
    .reverse()
    .map((f, i) => ({ n: i + 1, id: f.id, kind: f.kind, at: f.at, source: f.source, text: moveFactText(f) }));

/** 지문 — 버전 · 자산 · 종목 · 거래일 · 프롬프트 사실 id. 몫 숫자는 넣지 않는다(위 머리) */
export const moveSummaryFingerprint = (card: Pick<MoveCard, "asset" | "symbol" | "date" | "facts">): string =>
  createHash("sha256")
    .update(
      JSON.stringify([
        MOVE_SUMMARY_PROMPT_VERSION,
        MOVE_SUMMARY_VERIFIER_VERSION,
        card.asset,
        card.symbol.toUpperCase(),
        card.date,
        moveSummaryPromptFacts(card.facts)
          .map((f) => f.id)
          .sort(),
      ])
    )
    .digest("hex");

export type MoveSummaryFailure = "no_citation" | "guard_blocked";

export type MoveSummaryVerdict =
  | { ok: true; text: string; citations: string[] }
  | { ok: false; gate: MoveSummaryFailure; reasons: MoveSummaryRejection[] };

export type MoveSummaryRejection = LanguageViolation | "no_citation" | "unknown_citation" | "causal" | "future" | "unverified_number" | "too_long";

/**
 * 원인 단정 — 해설 검사(`CAUSAL`)는 근거 숫자가 있으면 통과시키지만 ③은 늘 막는다(`ADR-009` "~때문에 올랐다" 단정 0).
 * "호재 · 악재"도 원인 판정이다(측정 태그와 같은 선 — `ADR-009` 2026-11-10 개정)
 */
const CAUSAL_STRICT =
  /(때문|탓|덕분|덕에|원인|이유로|로\s*인해|영향으로|영향을\s*(받|줘|주)|여파|힘입|견인|끌어\s*(올|내)|촉발|호재|악재|(으)?로\s*(주가가?\s*)?(상승|하락|급등|급락)|(오르|올라|내려|떨어|상승해|하락해|급등해|급락해)서)/;
/** 앞날 — 지난 하루의 사실만 말한다 */
const FUTURE = /(전망|예상|예측|것으로\s*보|할\s*것|될\s*것|일\s*것|가능성|기대(된|되|돼|감)|우려(된|되|돼)|앞으로|향후|내일|이어질|계속될|오를\s*수|내릴\s*수)/;

const CITATION = /\[(\d{1,2})\]/g;

const splitSentences = (text: string): string[] =>
  (text.replace(/\s+/g, " ").match(/.+?[.!?。](?=\s|$)|.+$/g) ?? []).map((t) => t.trim()).filter(Boolean);

/**
 * LLM 문장 검사 — 경계 표 테스트(`moveSummary.test.ts`). 문장 단위로 보고 **통과한 첫 문장 하나**만 남긴다.
 *
 * 1. 인용 `[n]` 이 하나 이상 · 모든 n 이 입력 번호 안 — 아니면 그 문장 버림(인용 없는 절 제거)
 * 2. 원인 단정 · 앞날 · 공용 말투 검사(`languageViolations`) — 인용한 사실 글을 그대로 옮긴 부분은 빼고 본다
 *    (공시 제목 "실적 전망 공시"를 옮긴 것은 우리 주장이 아니다)
 * 3. 숫자 — 인용한 사실 글에 있는 숫자만. 그 밖은 지어낸 것(분해 숫자 포함 — ①이 보인다)
 * 4. 길이 상한
 *
 * 남긴 문장의 인용은 나온 순서대로 다시 번호를 매기고(`[1]` 이 첫 인용), id 를 돌려준다. 화면은 `[k]` → `citations[k-1]`
 */
export const verifyMoveSummary = (raw: string, facts: readonly MoveSummaryPromptFact[]): MoveSummaryVerdict => {
  const byN = new Map(facts.map((f) => [f.n, f]));
  const reasons: MoveSummaryRejection[] = [];
  let sawCitation = false;

  for (const sentence of splitSentences(raw)) {
    const ns = Array.from(sentence.matchAll(CITATION), (m) => Number(m[1]));
    if (ns.length === 0) {
      reasons.push("no_citation");
      continue;
    }
    if (ns.some((n) => !byN.has(n))) {
      reasons.push("unknown_citation");
      continue;
    }
    sawCitation = true;
    const cited = [...new Set(ns)].map((n) => byN.get(n)!);
    const plain = sentence.replace(CITATION, "").replace(/\s+([.,!?])/g, "$1").replace(/\s{2,}/g, " ").trim();

    let rest = plain;
    for (const f of cited) if (f.text.length >= 4) rest = rest.split(f.text).join(" ");
    const why: MoveSummaryRejection[] = [...languageViolations(rest)];
    if (CAUSAL_STRICT.test(rest)) why.push("causal");
    if (FUTURE.test(rest)) why.push("future");

    const sourceNumbers: NumericFact[] = cited.flatMap((f) => numericTokens(f.text));
    // 시각 · 날짜는 사실의 메타라 숫자 대조에서 뺀다("오후 2시 공시" 같은 문장) — 프롬프트가 시각을 함께 준다
    const tokens = numericTokens(plain.replace(/\d{1,2}\s*시(\s*\d{1,2}\s*분)?|\d{1,2}\s*월\s*\d{1,2}\s*일/g, " "));
    if (tokens.some((t) => !isSupported(t, sourceNumbers))) why.push("unverified_number");
    if (plain.length > MOVE_SUMMARY_MAX_CHARS) why.push("too_long");

    if (why.length > 0) {
      reasons.push(...why);
      continue;
    }

    const order: number[] = [];
    for (const n of ns) if (!order.includes(n)) order.push(n);
    const text = sentence
      .replace(CITATION, (_m, n: string) => `[${order.indexOf(Number(n)) + 1}]`)
      .replace(/\s{2,}/g, " ")
      .trim();
    return { ok: true, text, citations: order.map((n) => byN.get(n)!.id) };
  }
  return { ok: false, gate: sawCitation ? "guard_blocked" : "no_citation", reasons: [...new Set(reasons)] };
};

/** 저장된 시도 하나(읽기 · 상한 판단에 쓰는 칸만) */
export interface StoredMoveSummary {
  fingerprint: string;
  gate: "ok" | MoveSummaryFailure;
  text: string | null;
  citations: string[];
  generatedAt: Date;
}

export type MoveSummaryGate = "ok" | "quiet" | "pending" | "no_split" | "no_card" | "disabled" | MoveSummaryFailure;

export interface MoveSummaryView {
  gate: MoveSummaryGate;
  /** `ai` = 인용 붙은 AI 문장(AI 표시 필수) · `server` = 조용한 날 서버 문장 */
  summary: { text: string; citations: string[]; label: "ai" | "server"; generatedAt: string | null } | null;
}

/**
 * 읽기 — 지금 카드와 저장본을 대조한다(설명 3종 게이트 `ADR-009` §3: 분해 · 인용 ≥1 · AI 표시).
 * 경계 표 테스트(`moveSummary.test.ts`).
 *
 * - 꺼짐 → `disabled` · 분해 없음 → `no_split` · 카드가 안 서는 날 → `no_card`(③ 자리 없음)
 * - 조용한 날 → 서버 문장(LLM 0)
 * - 오늘 성공본의 인용이 **지금 사실에 다 있으면** 보인다(지문이 바뀌었어도 — 새 소식이 와서 다시 만드는 중이어도 맞는 문장이다)
 * - 지금 지문의 시도가 실패로 남았으면 그 사유 · 아니면 `pending`(배치가 아직)
 */
export const selectMoveSummary = (input: {
  enabled: boolean;
  card: MoveCard;
  /** 지금 지문의 저장 시도 */
  current: StoredMoveSummary | null;
  /** 오늘(같은 거래일) 가장 최근 성공본 */
  latestOk: StoredMoveSummary | null;
}): MoveSummaryView => {
  const { card } = input;
  if (!input.enabled) return { gate: "disabled", summary: null };
  if (!card.split) return { gate: "no_split", summary: null };
  if (!card.show) return { gate: "no_card", summary: null };
  if (moveQuietReason(card)) {
    return { gate: "quiet", summary: { text: MOVE_SUMMARY_QUIET_TEXT, citations: [], label: "server", generatedAt: null } };
  }
  const ids = new Set(card.facts.map((f) => f.id));
  const ok = input.latestOk;
  if (ok && ok.gate === "ok" && ok.text && ok.citations.length > 0 && ok.citations.every((id) => ids.has(id))) {
    return {
      gate: "ok",
      summary: { text: ok.text, citations: ok.citations, label: "ai", generatedAt: ok.generatedAt.toISOString() },
    };
  }
  if (input.current && input.current.gate !== "ok") return { gate: input.current.gate, summary: null };
  return { gate: "pending", summary: null };
};

/**
 * 배치가 LLM 을 불러야 하나 — 카드가 서고 · 조용하지 않고 · 이 지문의 시도가 없고 · 오늘 시도 상한 안
 */
export const needsMoveSummary = (input: {
  card: MoveCard;
  current: StoredMoveSummary | null;
  attemptsToday: number;
}): "generate" | "skip_no_card" | "skip_quiet" | "skip_same" | "skip_daily_cap" => {
  if (!input.card.show || !input.card.split) return "skip_no_card";
  if (moveQuietReason(input.card)) return "skip_quiet";
  if (input.current) return "skip_same";
  if (input.attemptsToday >= MOVE_SUMMARY_DAILY_ATTEMPTS) return "skip_daily_cap";
  return "generate";
};

/** 카드 재료가 없는 종목(코인 목록에 없음 · 국내 마스터에 없음 · 국내 꺼짐) — 404 */
export class MoveCardNotFoundError extends DomainError {
  constructor(symbol: string) {
    super("MOVE_CARD_NOT_FOUND", ErrorKind.NotFound, `오늘 등락 카드가 없는 종목: ${symbol}`);
  }
}

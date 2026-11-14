/**
 * 사실 추출 검사(F017 v4 2c · `SRV-REQ-053` FR-14 · `ADR-009` v4) — LLM 은 **읽기만** 한다. 무엇을 남길지는 이 규칙이 정한다.
 *
 * - 사실 하나 = `{ who, what, amount, unit, compared_to, when }` — 짧은 명사구. **기사 문장은 남기지 않는다**(`what` 40자 · 문장 끝 금지)
 * - **숫자는 원문 글자와 대조** — 원문에 그 숫자가 그대로 없으면 그 사실을 버린다(LLM 이 환산 · 계산한 숫자 0). 단위도 원문에 있어야
 * - 사건 종류는 LLM 이 정하지 않는다 — 제목에 예측 사전(`news_kind_dict`)을 대 붙인다(부르는 쪽)
 * - 본문 하나에 최대 `FACT_MAX_PER_BODY` · 같은 `what` 한 번
 *
 * 순수 — I/O 없음.
 */

/** 프롬프트 · 검사 규칙 판 — 바꾸면 올린다(행마다 남는다) */
export const FACT_EXTRACTOR_VERSION = "fact-extract@1";
export const FACT_MAX_PER_BODY = 8;
const MAX_WHO = 30;
const MAX_WHAT = 40;
const MAX_UNIT = 10;
const MAX_COMPARED = 40;
const MAX_WHEN = 20;
/** LLM 에 보내는 본문 상한(글자) — 기사 앞부분에 사실이 몰린다 */
export const FACT_SOURCE_MAX_CHARS = 6_000;

export interface FactDraft {
  who: string;
  what: string;
  /** 원문 숫자 그대로(쉼표 뺀 10진 문자열) — 금액이 아닐 수도 있다(%, 주, 건) */
  amount: string | null;
  unit: string | null;
  comparedTo: string | null;
  whenText: string | null;
}

export type FactDropReason =
  | "not_object"
  | "who"
  | "what"
  | "sentence"
  | "amount_not_number"
  | "amount_not_in_source"
  | "unit_missing"
  | "unit_not_in_source"
  | "duplicate"
  | "over_limit";

export interface FactCheckResult {
  kept: FactDraft[];
  dropped: FactDropReason[];
  /** 출력이 JSON 배열이 아니었다 — 실패로 센다(사실 0 과 다르다) */
  malformed: boolean;
}

/** 출력에서 JSON 배열 하나 — 앞뒤 말 · 코드 울타리를 견딘다. `{ "facts": [...] }` 도 받는다 */
export const parseFactArray = (text: string): unknown[] | null => {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  const whole = tryParse(cleaned);
  if (Array.isArray(whole)) return whole;
  if (whole && typeof whole === "object" && Array.isArray((whole as { facts?: unknown }).facts)) return (whole as { facts: unknown[] }).facts;
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  const inner = tryParse(cleaned.slice(start, end + 1));
  return Array.isArray(inner) ? inner : null;
};

/** 숫자 표기를 한 꼴로 — 쉼표 · 앞 + 뺌, 소수 끝 0 뺌("1,234.50" → "1234.5") */
export const canonicalNumber = (raw: string): string | null => {
  const s = raw.replace(/,/g, "").replace(/^\+/, "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const [int, frac] = s.split(".");
  const i = String(BigInt(int!));
  const f = (frac ?? "").replace(/0+$/, "");
  return f ? `${i}.${f}` : i;
};

/** 원문에 적힌 숫자 전부(한 꼴). 바로 앞에 빼기표(`-` · `−` · `△` · `▲` 아님)가 붙은 숫자는 음수로도 넣는다 */
export const numbersInSource = (text: string): Set<string> => {
  const out = new Set<string>();
  for (const m of text.matchAll(/([-−△])?(\d[\d,]*(?:\.\d+)?)/g)) {
    const c = canonicalNumber(m[2]!);
    if (c === null) continue;
    out.add(c);
    if (m[1] && c !== "0") out.add(`-${c}`);
  }
  return out;
};

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t.length > 0 && t.length <= max ? t : null;
};

const optional = (v: unknown, max: number): string | null =>
  v === null || v === undefined || v === "" ? null : str(v, max);

/** 문장인가 — 서술 어미 · 마침표로 끝나면 사실 칸이 아니라 기사 문장이다 */
const looksLikeSentence = (s: string) => /(다|요|음|함)\.?$|[.!?。]$/.test(s);

/** 원문(제목 + 문단)에 대고 LLM 출력을 거른다 */
export const checkExtractedFacts = (output: string, source: string): FactCheckResult => {
  const raw = parseFactArray(output);
  if (raw === null) return { kept: [], dropped: [], malformed: true };
  const numbers = numbersInSource(source);
  const compact = source.replace(/\s+/g, "");
  const kept: FactDraft[] = [];
  const dropped: FactDropReason[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      dropped.push("not_object");
      continue;
    }
    const o = item as Record<string, unknown>;
    const who = str(o.who, MAX_WHO);
    if (!who) {
      dropped.push("who");
      continue;
    }
    const what = str(o.what, MAX_WHAT);
    if (!what) {
      dropped.push("what");
      continue;
    }
    if (looksLikeSentence(what)) {
      dropped.push("sentence");
      continue;
    }
    let amount: string | null = null;
    let unit: string | null = null;
    if (o.amount !== null && o.amount !== undefined && o.amount !== "") {
      amount = canonicalNumber(typeof o.amount === "number" ? String(o.amount) : String(o.amount));
      if (amount === null || (typeof o.amount === "number" && !Number.isFinite(o.amount))) {
        dropped.push("amount_not_number");
        continue;
      }
      if (!numbers.has(amount)) {
        dropped.push("amount_not_in_source");
        continue;
      }
      unit = str(o.unit, MAX_UNIT);
      if (!unit) {
        dropped.push("unit_missing");
        continue;
      }
      if (!compact.includes(unit.replace(/\s+/g, ""))) {
        dropped.push("unit_not_in_source");
        continue;
      }
    }
    if (seen.has(what)) {
      dropped.push("duplicate");
      continue;
    }
    if (kept.length >= FACT_MAX_PER_BODY) {
      dropped.push("over_limit");
      continue;
    }
    seen.add(what);
    kept.push({ who, what, amount, unit, comparedTo: optional(o.compared_to, MAX_COMPARED), whenText: optional(o.when, MAX_WHEN) });
  }
  return { kept, dropped, malformed: false };
};

/** LLM 에 보낼 원문 — 제목 + 문단, 상한에서 자름 */
export const factSourceText = (title: string, paragraphs: readonly string[]): string =>
  [title, ...paragraphs].join("\n").slice(0, FACT_SOURCE_MAX_CHARS);

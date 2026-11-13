import type { NewsReactionView, NewsTagLabel } from "./NewsTag";

/**
 * 오늘 왜 움직였나 — 원인 → 근거 → 결과 조립(F017 v4 순서 1b · `SRV-REQ-053` FR-11 · FR-17 · `ADR-009` v4 · D21).
 *
 * **서버 계산 · LLM 0.** 분해(① `MoveSplit`)와 같은 날 사실(②)을 재료로, 원인 후보마다 받치는 근거를 세어 세 단계로만 말한다:
 *
 * - `likely`(가장 유력) — 시각이 맞는 근거를 포함해 받치는 근거 **둘 이상**
 * - `possible`(가능성) — 받치는 근거 **하나**
 * - `none`(확인된 소식 없음) — 받치는 근거 0. 이것도 데이터다(오늘 소식 n건 · 평소 대비 크기)
 *
 * ## 불변식
 *
 * 1. **근거 없는 원인은 없다** — 후보는 받치는 근거(`supports`)가 하나라도 있어야 목록에 오른다. 단계는 근거 수가 정한다(문턱 아님)
 * 2. **근거 하나 = 사실 + 숫자 + 비교 + 출처 · 시각** — `value`(굵은 숫자) · `compare`(평소 · 업종 · 과거 대비) · `source` · `at`.
 *    비교할 값이 없으면 근거는 실리되 받치지 않는다(지어내지 않는다)
 * 3. **목록이 비지 않는다** — 받치는 후보가 없으면 `none` 하나("확인된 소식이 없어요" 또는 "평소 범위 안")
 * 4. 단정 · 앞날 문장 0 — 머리말은 명사구(무슨 일), 결과는 지난 사실과 과거 기록만
 *
 * 받침 기준(아래 상수)은 "이 근거가 오늘 방향을 받치나"의 정의다 — 보여 줄 대상 · 임계는 서버가 정한다(`done-checklist.md` §2-2).
 */

export type MoveCauseMarket = "kr" | "crypto";
export type MoveCauseKind = "disclosure" | "news" | "warning" | "listing" | "sector" | "market" | "flow" | "none";
export type MoveCauseStrength = "likely" | "possible" | "none";

/** 근거 종류 — 화면이 줄마다 작은 그래픽을 고른다 */
export type MoveEvidenceKind =
  | "post_move"
  | "past_reaction"
  | "pre_move"
  | "idio_share"
  | "sector_index"
  | "sector_breadth"
  | "sector_share"
  | "market_index"
  | "market_share"
  | "program_flow"
  | "investor_flow"
  | "exchange_flag"
  | "listing_age"
  | "news_count"
  | "usual_range";

export interface MoveEvidence {
  kind: MoveEvidenceKind;
  /** 굵게 그릴 사실 + 숫자 — "공시 뒤 30분 +2.1%" */
  value: string;
  /** 비교 — "평소(41억 원)의 7.6배". 없으면 null */
  compare: string | null;
  /** 용어 풀이(서버 사전) — 처음 보는 말만 */
  gloss: string | null;
  /** 출처 이름(번호 아님) — "시세" · "수급" · "업종" · 제공처 이름 */
  source: string;
  at: string | null;
  /** 오늘 방향을 받치나 — 단계를 세는 근거 */
  supports: boolean;
}

export interface MoveCause {
  kind: MoveCauseKind;
  strength: MoveCauseStrength;
  /** 무슨 일인가 — 명사구. 소식이면 제목 그대로 */
  headline: string;
  /** 왜 그 단계인가 한 줄 — "소식 뒤부터 움직였어요". 단계 이름(가장 유력 · 가능성)은 화면이 붙인다 — 문장에 되풀이하지 않는다 */
  note: string;
  /** 같은 날 사실(②)의 id — 소식 원인일 때만 */
  factId: string | null;
  at: string | null;
  evidence: MoveEvidence[];
}

export interface MoveCauseResult {
  /** 오늘 등락(%) — 분해와 같은 값 */
  changeRate: number;
  text: string;
  /** 같은 종류 소식의 과거 기록 한 줄 — 가장 앞 원인이 종류가 맞은 소식일 때만 */
  past: string | null;
}

export interface MoveCauseView {
  causes: MoveCause[];
  result: MoveCauseResult;
}

// ==================== 재료 ====================

export interface MoveCauseEvent {
  factId: string;
  kind: "disclosure" | "news";
  at: Date;
  title: string;
  source: string;
  /** 사건 종류(측정 태그 — 규칙 사전). 못 맞히면 null */
  eventKindText: string | null;
  label: NewsTagLabel | null;
  reaction: NewsReactionView | null;
  /** 소식 전 5봉 시장 대비(단순 비율) */
  preMove5d: number | null;
  /** 소식 뒤 가격 — 직전 봉 종가 대비 %(최대 30분). `afterOpen` = 소식이 장 밖이라 다음 장 첫 봉부터 잼. 봉이 없으면 null */
  after: { changePct: number; minutes: number; at: Date; afterOpen: boolean } | null;
}

export interface MoveCauseInput {
  market: MoveCauseMarket;
  /** 오늘 등락(%) */
  total: number;
  /** 평소 하루 변동(σ, %) */
  sigma: number | null;
  split: {
    market: number;
    sector: number | null;
    idio: number;
    /** 시장 이름 — "코스피" · "코스닥" · "비트코인" */
    marketName: string;
    sectorName: string | null;
    isBenchmark: boolean;
  } | null;
  marketChange: { rate: number; at: Date | null } | null;
  sectorChange: { rate: number; at: Date | null } | null;
  /** 같은 업종 종목(우리가 시세를 보는 것 · 자기 제외) */
  breadth: { total: number; up: number; down: number } | null;
  events: readonly MoveCauseEvent[];
  /** 오늘 프로그램 순매수(원)와 평소(앞 거래일들의 |마감 누적| 평균) */
  program: { netValue: number; at: Date; usualAbs: number | null; usualDays: number } | null;
  /** 가장 최근 확정 거래일의 외국인 · 기관 순매수(원)와 평소 */
  investor: {
    date: string;
    foreign: number;
    institution: number;
    usualAbsForeign: number | null;
    usualAbsInstitution: number | null;
    usualDays: number;
  } | null;
  /** 거래소 경보 · 유의 · 종목 상태(화면 문구로 바꾼 이름) */
  flags: ReadonlyArray<{ label: string; at: Date | null }>;
  /** 상장한 지 며칠(코인 — 원화 마켓). 모르면 null */
  listedDays: number | null;
  /** 오늘 우리가 모은 이 종목 소식 수 · 소식 원천을 읽었나 */
  newsCount: number | null;
}

// ==================== 받침 기준 ====================

/** 이보다 작게 움직인 날은 "평소 범위 안" — σ 의 절반(바닥 0.5%), σ 를 모르면 1% */
export const QUIET_SIGMA_RATIO = 0.5;
export const QUIET_MIN_RATE = 1;
/** 소식 뒤 가격이 오늘 방향으로 이만큼(%) 움직였으면 "소식 뒤부터 움직였다" */
export const POST_MOVE_MIN_RATE = 0.5;
/** 몫이 오늘 등락의 이 비율 이상이면 그 몫이 오늘을 받친다 */
export const SHARE_SUPPORT_RATIO = 0.4;
/** 지수 · 업종 지수가 오늘 방향으로 이만큼(%) 움직였으면 받친다 */
export const INDEX_MOVE_MIN_RATE = 0.5;
/** 같은 업종 종목의 이 비율 이상이 같은 방향이면 받친다(종목 수 `BREADTH_MIN_STOCKS` 이상일 때만) */
export const BREADTH_SUPPORT_RATIO = 2 / 3;
export const BREADTH_MIN_STOCKS = 3;
/** 수급이 평소의 이 배수 이상이고 같은 방향이면 받친다(평소를 `FLOW_USUAL_MIN_DAYS` 거래일 이상으로 잴 수 있을 때만) */
export const FLOW_SUPPORT_MULTIPLE = 2;
export const FLOW_USUAL_MIN_DAYS = 3;
/** 상장한 지 이 날 수 안이면 "새로 상장한 코인" */
export const NEW_LISTING_DAYS = 14;
/** 원인 후보 상한 — 화면 한 칸 */
export const MOVE_CAUSE_LIMIT = 3;

// ==================== 문구 조각 ====================

const MINUS = "−";
const signedPct = (v: number) => `${v > 0 ? "+" : v < 0 ? MINUS : ""}${Math.abs(v).toFixed(1)}%`;
/** 몫(%p)과 오늘 등락은 둘째 자리 — 같은 카드의 분해 표(①)와 같은 모양(같은 숫자를 두 모양으로 보이지 않는다) */
const signedPp = (v: number) => `${v > 0 ? "+" : v < 0 ? MINUS : ""}${Math.abs(v).toFixed(2)}%p`;
const signedTotal = (v: number) => `${v > 0 ? "+" : v < 0 ? MINUS : ""}${Math.abs(v).toFixed(2)}%`;
const outOf100 = (rate: number) => Math.round(rate * 100);
const times = (v: number) => `${v >= 10 ? Math.round(v) : v.toFixed(1)}배`;

/** 원 → "312억 원" · "4,200만 원" — 부호는 호출자가 "순매수 · 순매도"로 말한다 */
export const krwAmount = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(abs / 1e12).toFixed(1)}조 원`;
  if (abs >= 1e8) return `${Math.round(abs / 1e8).toLocaleString("ko-KR")}억 원`;
  if (abs >= 1e4) return `${Math.round(abs / 1e4).toLocaleString("ko-KR")}만 원`;
  return `${Math.round(abs).toLocaleString("ko-KR")}원`;
};

const GLOSS = {
  program: "프로그램 매매는 기관 · 외국인이 여러 종목을 묶어 자동으로 내는 주문이에요",
  share: "몫은 오늘 등락을 시장 · 업종 · 이 종목만의 움직임으로 나눈 값이에요",
  excess: "시장이 움직인 만큼을 뺀, 이 종목만의 움직임이에요",
} as const;


/** 같은 방향인가 — 0 은 어느 쪽도 아니다 */
const sameSide = (a: number, b: number) => a !== 0 && b !== 0 && a > 0 === b > 0;
/** 몫이 오늘 등락을 받치나 */
const shareSupports = (share: number, total: number) => sameSide(share, total) && Math.abs(share) >= SHARE_SUPPORT_RATIO * Math.abs(total);

const strengthOf = (evidence: readonly MoveEvidence[], timed: boolean): MoveCauseStrength => {
  const n = evidence.filter((e) => e.supports).length;
  if (n >= 2 && timed) return "likely";
  return n >= 1 ? "possible" : "none";
};

/** 오늘이 평소 범위 안인가 */
export const isQuietMove = (total: number, sigma: number | null): boolean =>
  Math.abs(total) < (sigma === null ? QUIET_MIN_RATE : Math.max(QUIET_MIN_RATE * QUIET_SIGMA_RATIO, sigma * QUIET_SIGMA_RATIO));

// ==================== 후보 ====================

const iso = (d: Date | null) => (d === null ? null : d.toISOString());

const idioEvidence = (input: MoveCauseInput): MoveEvidence | null => {
  const s = input.split;
  if (!s || s.isBenchmark) return null;
  return {
    kind: "idio_share",
    value: `이 종목만의 움직임 ${signedPp(s.idio)}`,
    compare: `오늘 ${signedTotal(input.total)} 중`,
    gloss: GLOSS.excess,
    source: "시세",
    at: null,
    supports: shareSupports(s.idio, input.total),
  };
};

/**
 * 원인 후보가 될 수 있는 소식인가 — 공시이거나, **무슨 일인지 아는**(사건 종류가 맞은) 기사만.
 * 종류를 모르는 기사 제목은 대개 그날 등락을 전하는 시황("○○ +5.18%, △△ +3.59%")이라 결과이지 원인이 아니다
 * (2026-11-13 실측 — 시황 묶음 제목이 "가장 유력"으로 올라왔다). 같은 날 사실 목록(②)에는 그대로 남는다
 */
export const isCauseEvent = (e: Pick<MoveCauseEvent, "kind" | "eventKindText">): boolean => e.kind === "disclosure" || e.eventKindText !== null;

/**
 * 소식 제목 → 원인 머리말. 제목은 원문 그대로 두되 **한 점 목표가만 뺀다** — 증권사 리포트 제목("… 목표가 400,000원 - 키움증권")이
 * 원인으로 올라 우리가 목표가를 앞세우게 된다(공통 수용 기준 4 "한 점 목표가 0건", 2026-11-13 실측). 같은 날 사실 목록(②)의 제목은 원문 그대로
 */
export const causeHeadline = (title: string): string =>
  title
    .replace(/\s*(적정\s*주가|목표\s*주가|목표가|TP)\s*[:：]?\s*[\d,.]+\s*(만\s*)?원(으로\s*(상향|하향|유지))?/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const eventCause = (input: MoveCauseInput, e: MoveCauseEvent): MoveCause => {
  const word = e.kind === "disclosure" ? "공시" : "소식";
  const evidence: MoveEvidence[] = [];
  const timed = e.after !== null && sameSide(e.after.changePct, input.total) && Math.abs(e.after.changePct) >= POST_MOVE_MIN_RATE;
  if (e.after) {
    evidence.push({
      kind: "post_move",
      // 장 밖 소식이면 "장이 열리고 첫 n분" — 소식 직후 n분처럼 읽히지 않게(전날 종가 대비)
      value: `${word} 뒤 ${e.after.afterOpen ? "장이 열리고 첫 " : ""}${e.after.minutes}분 ${signedPct(e.after.changePct)}`,
      compare: `오늘 ${signedTotal(input.total)} 중`,
      gloss: null,
      source: "시세",
      at: iso(e.after.at),
      supports: timed,
    });
  }
  const r = e.reaction;
  if (r && r.upRate !== null && e.eventKindText) {
    const base = r.baseUpRate === null ? null : `평소 ${outOf100(r.baseUpRate)}번`;
    evidence.push({
      kind: "past_reaction",
      value: `같은 종류(${e.eventKindText}) 소식 과거 ${r.sample.toLocaleString("ko-KR")}건`,
      compare: `다음 거래일 시장보다 더 오른 경우가 100번 중 ${outOf100(r.upRate)}번${base ? ` · ${base}` : ""}`,
      gloss: null,
      source: `과거 ${r.sample.toLocaleString("ko-KR")}건`,
      at: null,
      supports: (e.label === "up_usually" && input.total > 0) || (e.label === "down_usually" && input.total < 0),
    });
  }
  // 종목 몫은 **소식 자체의 근거가 받칠 때만** 같이 센다 — 몫만으로는 아무 제목이나 원인이 된다(2026-11-13 실측: 시황 묶음 제목)
  const own = evidence.some((x) => x.supports);
  const idio = idioEvidence(input);
  if (idio) evidence.push(own ? idio : { ...idio, supports: false });
  if (e.preMove5d !== null) {
    evidence.push({
      kind: "pre_move",
      value: `${word} 전 5거래일 ${signedPct(e.preMove5d * 100)}`,
      compare: "시장 대비 · 소식 전에 이미 움직인 폭이에요",
      gloss: null,
      source: "시세",
      at: null,
      supports: false,
    });
  }
  const strength = strengthOf(evidence, timed);
  return {
    kind: e.kind,
    strength,
    headline: causeHeadline(e.title),
    note: strength === "likely" ? `${word} 뒤부터 움직였어요` : strength === "possible" ? "받치는 근거가 하나예요" : "",
    factId: e.factId,
    at: e.at.toISOString(),
    evidence,
  };
};

const sectorCause = (input: MoveCauseInput): MoveCause | null => {
  const s = input.split;
  if (!s || s.sector === null || !input.sectorChange) return null;
  const name = s.sectorName ?? "업종";
  const evidence: MoveEvidence[] = [
    {
      kind: "sector_index",
      value: `${name} 지수 ${signedPct(input.sectorChange.rate)}`,
      compare: input.marketChange ? `${s.marketName} ${signedPct(input.marketChange.rate)}` : null,
      gloss: null,
      source: "업종",
      at: iso(input.sectorChange.at),
      supports: sameSide(input.sectorChange.rate, input.total) && Math.abs(input.sectorChange.rate) >= INDEX_MOVE_MIN_RATE,
    },
    {
      kind: "sector_share",
      value: `업종 몫 ${signedPp(s.sector)}`,
      compare: `오늘 ${signedTotal(input.total)} 중`,
      gloss: GLOSS.share,
      source: "시세",
      at: null,
      supports: shareSupports(s.sector, input.total),
    },
  ];
  const b = input.breadth;
  if (b && b.total >= BREADTH_MIN_STOCKS) {
    const up = input.total > 0;
    const side = up ? b.up : b.down;
    evidence.push({
      kind: "sector_breadth",
      value: `같은 업종 ${b.total}종목 중 ${side}종목이 같이 ${up ? "올랐어요" : "내렸어요"}`,
      compare: "우리가 시세를 보는 종목 기준",
      gloss: null,
      source: "업종",
      at: null,
      supports: side / b.total >= BREADTH_SUPPORT_RATIO,
    });
  }
  // 업종 지수가 오늘 방향으로 움직인 것이 "시각이 맞는 사건"이다 — 몫 · 폭은 그것을 받친다
  const strength = strengthOf(evidence, evidence[0].supports);
  return {
    kind: "sector",
    strength,
    headline: `${name} 업종 전체 ${input.total > 0 ? "상승" : "하락"}`,
    note: strength === "none" ? "" : "업종이 같이 움직였어요",
    factId: null,
    at: iso(input.sectorChange.at),
    evidence,
  };
};

const marketCause = (input: MoveCauseInput): MoveCause | null => {
  const s = input.split;
  if (!s || s.isBenchmark || !input.marketChange) return null;
  const evidence: MoveEvidence[] = [
    {
      kind: "market_index",
      value: `${s.marketName} ${signedPct(input.marketChange.rate)}`,
      compare: null,
      gloss: null,
      source: input.market === "kr" ? "지수" : "시세",
      at: iso(input.marketChange.at),
      supports: sameSide(input.marketChange.rate, input.total) && Math.abs(input.marketChange.rate) >= INDEX_MOVE_MIN_RATE,
    },
    {
      kind: "market_share",
      value: `오늘 ${signedTotal(input.total)} 중 ${signedPp(s.market)}는 ${s.marketName} 따라`,
      compare: `나머지 ${signedPp(input.total - s.market)}`,
      gloss: GLOSS.share,
      source: "시세",
      at: null,
      supports: shareSupports(s.market, input.total),
    },
  ];
  const strength = strengthOf(evidence, evidence[0].supports);
  return {
    kind: "market",
    strength,
    headline: input.market === "kr" ? `${s.marketName} 시장 전체 ${input.total > 0 ? "상승" : "하락"}` : `${s.marketName} 따라 ${input.total > 0 ? "상승" : "하락"}`,
    note: strength === "none" ? "" : "시장이 같이 움직였어요",
    factId: null,
    at: iso(input.marketChange.at),
    evidence,
  };
};

const flowEvidence = (
  kind: "program_flow" | "investor_flow",
  who: string,
  net: number,
  usualAbs: number | null,
  usualDays: number,
  total: number,
  source: string,
  at: string | null,
  gloss: string | null
): MoveEvidence => {
  const measurable = usualAbs !== null && usualAbs > 0 && usualDays >= FLOW_USUAL_MIN_DAYS;
  const multiple = measurable ? Math.abs(net) / usualAbs : null;
  return {
    kind,
    value: `${who} ${net >= 0 ? "순매수" : "순매도"} ${krwAmount(net)}`,
    compare: multiple === null ? null : `최근 ${usualDays}거래일 평균(${krwAmount(usualAbs!)})의 ${times(multiple)}`,
    gloss,
    source,
    at,
    supports: multiple !== null && multiple >= FLOW_SUPPORT_MULTIPLE && sameSide(net, total),
  };
};

const flowCause = (input: MoveCauseInput): MoveCause | null => {
  const evidence: MoveEvidence[] = [];
  const p = input.program;
  if (p) evidence.push(flowEvidence("program_flow", "프로그램", p.netValue, p.usualAbs, p.usualDays, input.total, "수급", p.at.toISOString(), GLOSS.program));
  const v = input.investor;
  if (v) {
    // 확정 수급은 전 거래일 값이다 — 날짜를 값에 같이 적는다(오늘 일처럼 읽히지 않게)
    const day = `${Number(v.date.slice(5, 7))}/${Number(v.date.slice(8, 10))}`;
    evidence.push(flowEvidence("investor_flow", `${day} 외국인`, v.foreign, v.usualAbsForeign, v.usualDays, input.total, "수급", null, null));
    evidence.push(flowEvidence("investor_flow", `${day} 기관`, v.institution, v.usualAbsInstitution, v.usualDays, input.total, "수급", null, null));
  }
  if (evidence.length === 0) return null;
  // 오늘 값(프로그램)이 받쳐야 "시각이 맞는다" — 전날 수급만으로는 가능성까지
  const strength = strengthOf(evidence, evidence[0].kind === "program_flow" && evidence[0].supports);
  return {
    kind: "flow",
    strength,
    // 머리말은 받치는 근거가 정한다 — 전날 수급만 받치는데 오늘 주문처럼 말하지 않는다
    headline: `${(evidence.find((x) => x.supports) ?? evidence[0]).value.replace(/ [\d,.]+(조|억|만)? ?원$/, "")}가 평소보다 컸어요`,
    note: strength === "none" ? "" : "평소보다 큰 수급이에요",
    factId: null,
    at: p ? p.at.toISOString() : null,
    evidence,
  };
};

const flagCause = (input: MoveCauseInput): MoveCause | null => {
  if (input.flags.length === 0) return null;
  const evidence: MoveEvidence[] = input.flags.map((f) => ({
    kind: "exchange_flag",
    value: f.label,
    compare: null,
    gloss: null,
    source: "거래소",
    at: iso(f.at),
    supports: true,
  }));
  // 지정 시각을 모른다(원천에 없다) — 근거가 여럿이어도 "시각이 맞는다"고 말하지 않는다
  return {
    kind: "warning",
    strength: "possible",
    headline: `거래소 표시 — ${input.flags.map((f) => f.label).join(" · ")}`,
    note: "거래소가 붙인 표시가 있어요",
    factId: null,
    at: iso(input.flags[0].at),
    evidence,
  };
};

const listingCause = (input: MoveCauseInput): MoveCause | null => {
  if (input.listedDays === null || input.listedDays < 0 || input.listedDays > NEW_LISTING_DAYS) return null;
  return {
    kind: "listing",
    strength: "possible",
    headline: input.listedDays === 0 ? "오늘 원화 마켓에 상장한 코인" : `원화 마켓에 상장한 지 ${input.listedDays}일 된 코인`,
    note: "새로 상장한 코인은 크게 흔들려요",
    factId: null,
    at: null,
    evidence: [
      {
        kind: "listing_age",
        value: input.listedDays === 0 ? "상장 첫날" : `상장 ${input.listedDays + 1}일째`,
        compare: `상장 뒤 ${NEW_LISTING_DAYS}일 안`,
        gloss: null,
        source: "거래소",
        at: null,
        supports: true,
      },
    ],
  };
};

/** 소식 수 옆 한마디 — 실제로 본 것만 말한다(작은 날은 견주지 않았고, 큰 날은 가격을 잰 소식 수를 적는다) */
const newsCompare = (input: MoveCauseInput, quiet: boolean): string => {
  if (input.newsCount === 0) return "세상에 소식이 없다는 뜻은 아니에요";
  if (quiet) return "작은 움직임이라 소식과 견주지 않았어요";
  const checked = input.events.filter((e) => isCauseEvent(e) && e.after !== null).length;
  if (checked === 0 && input.events.every((e) => !isCauseEvent(e))) return "무슨 일인지 알 수 있는 소식(공시 · 종류가 맞은 기사)은 없었어요";
  return checked === 0
    ? "소식 뒤 가격을 잴 봉이 아직 없어요"
    : `최근 ${checked}건 뒤 ${POST_MOVE_WINDOW_MINUTES}분 가격은 오늘 방향으로 뚜렷이 움직이지 않았어요`;
};

const noneCause = (input: MoveCauseInput, quiet: boolean): MoveCause => {
  const evidence: MoveEvidence[] = [];
  if (input.sigma !== null && input.sigma > 0) {
    evidence.push({
      kind: "usual_range",
      value: `오늘 ${signedTotal(input.total)}`,
      compare: `평소 하루 변동(±${input.sigma.toFixed(1)}%)의 ${times(Math.abs(input.total) / input.sigma)}`,
      gloss: null,
      source: "시세",
      at: null,
      supports: false,
    });
  }
  if (input.newsCount !== null) {
    evidence.push({
      kind: "news_count",
      value: `우리가 모은 오늘 소식 ${input.newsCount}건`,
      compare: newsCompare(input, quiet),
      gloss: null,
      source: "소식",
      at: null,
      supports: false,
    });
  }
  const idio = idioEvidence(input);
  if (idio && !quiet) evidence.push({ ...idio, supports: false });
  return {
    kind: "none",
    strength: "none",
    headline: quiet ? "평소 범위 안의 움직임이에요" : "확인된 소식이 없어요",
    note: quiet ? "따로 볼 만한 원인을 찾지 않았어요" : "아직 알려지지 않은 이유일 수 있어요",
    factId: null,
    at: null,
    evidence,
  };
};

// ==================== 조립 ====================

const STRENGTH_ORDER: Record<MoveCauseStrength, number> = { likely: 0, possible: 1, none: 2 };
/** 같은 단계면 이 순서 — 1차 출처(공시)가 앞, 수급은 맨 뒤 */
const KIND_ORDER: readonly MoveCauseKind[] = ["disclosure", "news", "warning", "listing", "sector", "market", "flow", "none"];

const resultOf = (input: MoveCauseInput, top: MoveCause): MoveCauseResult => {
  const event = top.factId ? input.events.find((e) => e.factId === top.factId) : undefined;
  const r = event?.reaction;
  const past =
    event && r && r.upRate !== null && event.eventKindText
      ? `같은 종류(${event.eventKindText}) 소식 과거 ${r.sample.toLocaleString("ko-KR")}건 뒤 다음 거래일, 시장보다 더 오른 경우가 100번 중 ${outOf100(r.upRate)}번이었어요${
          r.baseUpRate === null ? "" : `(평소 ${outOf100(r.baseUpRate)}번)`
        }.`
      : null;
  return { changeRate: Math.round(input.total * 100) / 100, text: `오늘 ${signedTotal(input.total)}`, past };
};

/**
 * 원인 후보(강한 것이 앞 · 상한 `MOVE_CAUSE_LIMIT`)와 결과. 받치는 근거가 있는 후보가 없으면 `none` 하나.
 * 평소 범위 안의 날은 원인을 찾지 않는다 — 작은 움직임에 이야기를 붙이지 않는다(`ADR-009` "근거 없을 때 그럴듯한 이야기 0").
 * 단 거래소 · 종목 상태 표시는 그날에도 싣는다(사실이라서)
 */
export const assembleMoveCauses = (input: MoveCauseInput): MoveCauseView => {
  const quiet = isQuietMove(input.total, input.sigma);
  // 작은 날에도 거래소 · 종목 상태 표시는 싣는다 — 이야기가 아니라 거래소가 붙인 사실이고, 그 표시로 카드가 선 날이 있다(2026-11-13 실측)
  const candidates: MoveCause[] = quiet
    ? [flagCause(input)].filter((c): c is MoveCause => c !== null)
    : [
        ...input.events.filter(isCauseEvent).map((e) => eventCause(input, e)),
        flagCause(input),
        listingCause(input),
        sectorCause(input),
        marketCause(input),
        flowCause(input),
      ].filter((c): c is MoveCause => c !== null && c.strength !== "none");
  candidates.sort(
    (a, b) =>
      STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength] ||
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      b.evidence.filter((e) => e.supports).length - a.evidence.filter((e) => e.supports).length
  );
  // 소식 원인은 가장 앞 하나만 — 같은 사건의 제목 여럿이 칸을 다 차지하지 않게
  const seenEvent = { done: false };
  const causes = candidates
    .filter((c) => {
      if (c.kind !== "disclosure" && c.kind !== "news") return true;
      if (seenEvent.done) return false;
      seenEvent.done = true;
      return true;
    })
    .slice(0, MOVE_CAUSE_LIMIT);
  const list = causes.length > 0 ? causes : [noneCause(input, quiet)];
  return { causes: list, result: resultOf(input, list[0]) };
};

// ==================== 근거 재료 읽기(Port) ====================

/** 소식 시각 뒤 가격 — 직전에 닫힌 봉 종가 → 소식 뒤 첫 봉부터 `windowMinutes` 안 마지막 봉 종가 */
export interface PriceAfterEvent {
  before: number;
  after: number;
  /** 뒤쪽 봉이 닫힌 시각 */
  afterAt: Date;
  /** 소식 뒤 첫 봉이 열린 시각 — 소식이 장 밖이면 다음 장 시작 */
  firstBarAt: Date;
}

/**
 * 원인 근거의 재료 — 저장값만 읽는다(외부 호출 0 · 한 문장씩). 값이 없으면 `null`(그 근거를 싣지 않는다 — 지어내지 않는다)
 */
export interface MoveEvidenceReader {
  /** 같은 업종(중분류 우선) 종목 중 `since` 뒤 시세가 있는 것 — 자기 제외 */
  krSectorBreadth(code: string, since: Date): Promise<{ total: number; up: number; down: number } | null>;
  /** `before` 앞 거래일들의 프로그램 마감 누적 |순매수| 평균 · 잰 거래일 수 */
  krProgramUsual(code: string, before: Date): Promise<{ usualAbs: number | null; days: number }>;
  /** 소식 시각마다 그 뒤 가격(5분봉). 봉이 없는 시각은 Map 에 없다 */
  pricesAfter(symbol: string, times: readonly Date[], windowMinutes: number): Promise<Map<number, PriceAfterEvent>>;
  /** 코인 원화 마켓 상장일(첫 일봉 날짜) — 모르면 `null` */
  cryptoListedAt(symbol: string): Promise<Date | null>;
}

/** 소식 뒤 가격을 보는 창(분) · 한 번에 보는 소식 수(가까운 것부터) · 다음 장 첫 봉까지 기다리는 한도(시간) */
export const POST_MOVE_WINDOW_MINUTES = 30;
export const POST_MOVE_EVENT_LIMIT = 5;
export const POST_MOVE_GAP_MAX_HOURS = 20;

/** 소식과 그 뒤 첫 봉 사이가 이보다 벌어지면 장 밖 소식 — 봉 하나(5분)보다 넉넉히 */
const AFTER_OPEN_GAP_MS = 10 * 60_000;

/** 읽은 가격 → 근거 재료. 가격이 0 이하면 없는 것으로 */
export const toAfterMove = (at: Date, p: PriceAfterEvent | undefined): MoveCauseEvent["after"] => {
  if (!p || !(p.before > 0) || !(p.after > 0)) return null;
  // 장 밖 소식이면 창은 다음 장 첫 봉부터 센다
  const from = Math.max(at.getTime(), p.firstBarAt.getTime());
  const minutes = Math.max(5, Math.min(POST_MOVE_WINDOW_MINUTES, Math.round((p.afterAt.getTime() - from) / 60_000)));
  const afterOpen = p.firstBarAt.getTime() - at.getTime() > AFTER_OPEN_GAP_MS;
  return { changePct: Math.round((p.after / p.before - 1) * 10_000) / 100, minutes, at: p.afterAt, afterOpen };
};

/** 투자자 수급 — 가장 최근 확정일 값과 그 앞 날들의 |값| 평균 */
export const toInvestorEvidence = (
  rows: ReadonlyArray<{ date: string; foreign: { value: number }; institution: { value: number } }>
): MoveCauseInput["investor"] => {
  const [latest, ...prior] = rows;
  if (!latest) return null;
  const mean = (pick: (r: (typeof rows)[number]) => number) =>
    prior.length === 0 ? null : prior.reduce((sum, r) => sum + Math.abs(pick(r)), 0) / prior.length;
  return {
    date: latest.date,
    foreign: latest.foreign.value,
    institution: latest.institution.value,
    usualAbsForeign: mean((r) => r.foreign.value),
    usualAbsInstitution: mean((r) => r.institution.value),
    usualDays: prior.length,
  };
};

// ==================== 거래소 표시 이름 ====================

/**
 * 종목 상태 · 거래소 경보를 사람 말로 — 근거 줄에 그대로 실린다. 코치 한 줄 요약(`coach/policy/moveSummary.ts`)과 같은 낱말을 쓴다
 * (컨텍스트가 달라 표를 나눠 갖는다 — 낱말을 바꾸면 두 곳을 같이)
 */
export const KR_FLAG_LABEL: Readonly<Record<string, string>> = {
  halted: "거래정지",
  paused: "거래 일시 중단",
  vi: "변동성 완화 장치(VI) 발동",
  caution: "투자주의 종목",
  warning: "투자경고 종목",
  danger: "투자위험 종목",
  attention: "투자유의 종목",
  administrative: "관리종목",
  liquidation: "정리매매 중",
  overheat: "단기과열 종목",
};

export const CRYPTO_CAUTION_LABEL: Readonly<Record<string, string>> = {
  PRICE_FLUCTUATIONS: "가격 급등락 주의",
  TRADING_VOLUME_SOARING: "거래량 급증 주의",
  DEPOSIT_AMOUNT_SOARING: "입금량 급증 주의",
  GLOBAL_PRICE_DIFFERENCES: "해외 시세와 차이 주의",
  CONCENTRATION_OF_SMALL_ACCOUNTS: "소수 계정 거래 집중 주의",
};
export const CRYPTO_WARNING_LABEL = "거래 유의 종목";

/** 시장 이름 — 지수 코드 → 화면 낱말 */
export const KR_MARKET_NAME: Readonly<Record<string, string>> = { "0001": "코스피", "1001": "코스닥" };
export const CRYPTO_MARKET_NAME = "비트코인";

/** 같은 날 사실(소식) → 원인 후보의 재료. 공시가 앞 · 그다음 최신순 · 상한 `POST_MOVE_EVENT_LIMIT` */
export const pickCauseEvents = <F extends { id: string; kind: string; at: Date; source: string; title: string; tag?: { eventKindText: string; label: NewsTagLabel; reaction: NewsReactionView | null; preMove5d: number | null } | null }>(
  facts: readonly F[]
): F[] =>
  facts
    .filter((f) => f.kind === "disclosure" || f.kind === "news" || f.kind === "crypto_news")
    .sort((a, b) => Number(b.kind === "disclosure") - Number(a.kind === "disclosure") || b.at.getTime() - a.at.getTime())
    .slice(0, POST_MOVE_EVENT_LIMIT);

/**
 * 회사 사정 칸(F017 v4 2d · `SRV-REQ-053` FR-12) — 추출 사실(`extracted_fact`)과 원인 칸의 업종 근거로 네 칸을 조립한다. 순수 · LLM 0.
 *
 * - 칸: 한 줄(가장 최근 중요한 사실) · 실적 · 오늘 · 업계 · **걸리는 점**. 좋은 점만 싣지 않는다 — 걸리는 사실이 창 안에 있으면 늘 싣는다
 * - 숫자 · 단위는 원문 그대로(추출 검사가 대조했다) — 여기서 계산 · 환산 0. 칸마다 출처 이름 · 시각
 * - **한 사실은 한 칸에만** — 걸리는 점이 먼저 갖고(늘 보이게), 남은 것에서 실적 · 오늘. 한 줄로 올린 사실은 실적 · 오늘에 다시 싣지 않는다
 *   (걸리는 점이면 그 칸에도 — 걸리는 점은 빠지지 않는다). 2026-11-14 실측: 같은 사실이 네 칸 중 셋에 반복됐다
 * - '오늘' 칸은 **게시 시각**이 KST 오늘인 사실 — 우리가 오늘 받은 어제 기사는 오늘 일이 아니다(실측 결함 2026-11-14)
 * - 단(`tier`): 7일 안 사실 = now · 90일 = usual · 365일 = longer · 없음 = defect("확인된 공시 · 기사 사실이 아직 없어요" — 빈 칸이 아니라 결함으로 센다)
 * - `available_at` 이 지금보다 뒤인 사실은 쓰지 않는다
 */

export interface CompanyFact {
  who: string;
  what: string;
  /** 원문 숫자(쉼표 없는 10진 문자열) */
  amount: string | null;
  unit: string | null;
  comparedTo: string | null;
  whenText: string | null;
  eventKind: string;
  sourceKind: "article" | "disclosure";
  sourceName: string;
  sourceUrl: string;
  publishedAt: Date;
  availableAt: Date;
}

export interface CompanyFactView {
  /** 화면 한 줄 — `누가 무엇 숫자단위 (비교)` 사실 나열(문장 아님) */
  text: string;
  who: string;
  what: string;
  amount: string | null;
  unit: string | null;
  comparedTo: string | null;
  whenText: string | null;
  kind: string;
  source: { kind: "article" | "disclosure"; name: string; url: string; at: string };
}

export interface CompanySectorLine {
  text: string;
  source: string;
  at: string | null;
}

export interface CompanyBriefView {
  headline: CompanyFactView | null;
  earnings: CompanyFactView[];
  today: CompanyFactView[];
  sector: CompanySectorLine[];
  concern: CompanyFactView[];
  /** 고른 창(일) — 7 · 90 · 365. 사실이 없으면 null */
  windowDays: number | null;
  /** 창 안 사실 수(칸에 다 싣지 못해도 센다) */
  factCount: number;
}

export type CompanyTier = "now" | "usual" | "longer" | "defect";

const DAY_MS = 24 * 60 * 60 * 1000;
export const COMPANY_WINDOWS: ReadonlyArray<{ days: number; tier: Exclude<CompanyTier, "defect"> }> = [
  { days: 7, tier: "now" },
  { days: 90, tier: "usual" },
  { days: 365, tier: "longer" },
];
/** 리더가 읽을 만큼 — 가장 긴 창 */
export const COMPANY_LOOKBACK_DAYS = 365;
export const COMPANY_CELL_MAX = 3;

/** 걸리는 점 — 사건 종류(예측 사전 id) */
const CONCERN_KINDS = new Set(["legal", "delisting_risk", "rights_offering", "convertible", "hack"]);
/** 걸리는 점 — 사실 낱말(무엇 · 비교에 있으면) */
const CONCERN_WORDS = /감소|적자|손실|하락|하향|소송|제재|과징금|연체|부채|횡령|배임|거래정지|정지|유출|해킹|철회|취소|지연|불성실|관리종목|상장폐지|감사의견|순유출|최저/;
/** 실적 — 사건 종류 또는 무엇 낱말 */
const EARNINGS_WORDS = /매출|영업이익|영업익|영업손실|순이익|순손실|당기순|실적|EPS|ROE/i;

export const isConcernFact = (f: Pick<CompanyFact, "eventKind" | "what" | "comparedTo">): boolean =>
  CONCERN_KINDS.has(f.eventKind) || CONCERN_WORDS.test(`${f.what} ${f.comparedTo ?? ""}`);

export const isEarningsFact = (f: Pick<CompanyFact, "eventKind" | "what">): boolean =>
  f.eventKind === "earnings" || EARNINGS_WORDS.test(f.what);

/** 원문 숫자를 읽기 좋게 — 정수부 세 자리 쉼표만(값은 그대로) */
export const formatFactAmount = (amount: string): string => {
  const [int, frac] = amount.replace(/^-/, "").split(".");
  const grouped = int!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${amount.startsWith("-") ? "-" : ""}${grouped}${frac ? `.${frac}` : ""}`;
};

export const companyFactText = (f: CompanyFact): string => {
  const number = f.amount !== null && f.unit ? ` ${formatFactAmount(f.amount)}${f.unit}` : "";
  const compared = f.comparedTo ? ` (${f.comparedTo})` : "";
  const who = f.what.startsWith(f.who) ? "" : `${f.who} `;
  return `${who}${f.what}${number}${compared}`;
};

const toView = (f: CompanyFact): CompanyFactView => ({
  text: companyFactText(f),
  who: f.who,
  what: f.what,
  amount: f.amount,
  unit: f.unit,
  comparedTo: f.comparedTo,
  whenText: f.whenText,
  kind: f.eventKind,
  source: { kind: f.sourceKind, name: f.sourceName, url: f.sourceUrl, at: f.availableAt.toISOString() },
});

/** 공시가 기사보다 앞(1차 원천) · 그다음 숫자가 있는 사실 · 최근 */
const rank = (a: CompanyFact, b: CompanyFact) =>
  (a.sourceKind === "disclosure" ? 0 : 1) - (b.sourceKind === "disclosure" ? 0 : 1) ||
  (a.amount === null ? 1 : 0) - (b.amount === null ? 1 : 0) ||
  b.availableAt.getTime() - a.availableAt.getTime();

/** 같은 사실(누가 · 무엇 · 숫자)이 여러 기사에 나오면 한 번 — 가장 앞 순위만 */
const dedupe = (facts: CompanyFact[]) => {
  const seen = new Set<string>();
  return facts.filter((f) => {
    const k = `${f.who}|${f.what}|${f.amount ?? ""}|${f.unit ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export const assembleCompanyBrief = (
  facts: readonly CompanyFact[],
  sector: readonly CompanySectorLine[],
  now: Date,
  todayStart: Date,
): { tier: CompanyTier; brief: CompanyBriefView } => {
  const known = facts.filter((f) => f.availableAt.getTime() <= now.getTime());
  const window = COMPANY_WINDOWS.find((w) => known.some((f) => now.getTime() - f.availableAt.getTime() <= w.days * DAY_MS));
  if (!window) {
    return {
      tier: "defect",
      brief: { headline: null, earnings: [], today: [], sector: [...sector], concern: [], windowDays: null, factCount: 0 },
    };
  }
  const inWindow = known.filter((f) => now.getTime() - f.availableAt.getTime() <= window.days * DAY_MS);
  // 최근 순(오늘 칸 · 한 줄) · 순위 순(실적 · 걸리는 점)
  const recent = dedupe([...inWindow].sort((a, b) => b.availableAt.getTime() - a.availableAt.getTime()));
  const ranked = dedupe([...inWindow].sort(rank));
  // 한 줄 = 가장 최근 날의 사실 중 순위가 가장 앞(숫자 있는 공시 → 숫자 있는 기사 → …)
  const latestDay = recent[0]!.availableAt.getTime() - DAY_MS;
  const headline = [...recent].filter((f) => f.availableAt.getTime() > latestDay).sort(rank)[0] ?? recent[0]!;
  const taken = new Set<CompanyFact>([headline]);
  const take = (list: CompanyFact[]) => {
    const out = list.filter((f) => !taken.has(f)).slice(0, COMPANY_CELL_MAX);
    out.forEach((f) => taken.add(f));
    return out;
  };
  // 걸리는 점은 한 줄과 겹쳐도 싣는다(빠지지 않게) — 그다음 실적 · 오늘은 이미 실은 사실을 건너뛴다
  const concern = ranked.filter(isConcernFact).slice(0, COMPANY_CELL_MAX);
  concern.forEach((f) => taken.add(f));
  const earnings = take(ranked.filter(isEarningsFact));
  const today = take(recent.filter((f) => f.publishedAt.getTime() >= todayStart.getTime()));
  return {
    tier: window.tier,
    brief: {
      headline: toView(headline),
      earnings: earnings.map(toView),
      today: today.map(toView),
      sector: [...sector],
      concern: concern.map(toView),
      windowDays: window.days,
      factCount: recent.length,
    },
  };
};

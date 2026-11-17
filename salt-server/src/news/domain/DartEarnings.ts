/**
 * DART 실적 공시 · 실적 일정(F008 슬라이스 24 2단계 — `SRV-REQ-041` FR-8~10 · `FC-REQ-021` FR-11~15) — 순수 규칙.
 *
 * 예측(`kr_earnings` 반응 · 예상 창)이 읽는 재료를 **회사 사정용 공시 목록(`dart_filing`)과 다른 표**에 둔다 — 10년 이력을
 * `dart_filing` 에 넣으면 사전등록 `event-window@2` 의 원천(`v_dart_filing_export`)과 회사 사정 칸이 같이 바뀐다.
 *
 * | 종류 | 보고서 | 쓰는 곳 |
 * |---|---|---|
 * | `earnings` | 영업(잠정)실적(공정공시) · 매출액또는손익구조 변경 · 분기 · 반기 · 사업보고서 | 실적 숫자가 처음 공개된 공시 → 반응 · 예상 창 |
 * | `ir` | 기업설명회(IR) 개최 — 본문 '개최목적 · 설명회내용'이 실적 발표일 때만 일정 | 확정 실적 일정 |
 * | `preview` | 결산실적공시 예고 — 본문 '공시예정일' · '결산대상기간 종료일' | 확정 실적 일정 |
 *
 * 자회사 실적(`(자회사의 주요경영사항)`) · 전망(`영업실적등에대한전망`) · 정정(`[기재정정]` 등 머리말)은 실적 공시가 아니다 —
 * 정정은 처음 공시가 이미 있다. 단 IR · 예고 정정은 날짜가 바뀌는 길이라 받는다(본문의 마지막 일시 블록 = 정정 뒤).
 */

export type EarningsFilingKind = "earnings" | "ir" | "preview";

/** 목록 종류 — 정기공시(A)는 이 표만 받는다(회사 사정 목록은 B · I) */
export const DART_EARNINGS_TYPES = ["A", "I"] as const;
export type DartEarningsType = (typeof DART_EARNINGS_TYPES)[number];

/** 이력 시작 — 분기 · 결산 유형별 예상 창이 표본 8 을 넘게(결산 10회). 예측 반응은 일봉이 있는 데까지만 쓴다 */
export const DART_EARNINGS_SINCE = "20160101";
/** 이미 받은 종목은 이 간격마다 최근 `DART_EARNINGS_REFRESH_DAYS` 일만 다시(정기보고서는 5분 목록에 없다) */
export const DART_EARNINGS_REFRESH_MS = 20 * 3_600_000;
export const DART_EARNINGS_REFRESH_DAYS = 14;
/** 한 회차에 맞추는 종목 수 · 본문을 읽는 IR · 예고 수(공식 하루 한도의 50% 안 — 회차 5분) */
export const DART_EARNINGS_STOCKS_PER_TICK = 5;
export const DART_EARNINGS_DOCS_PER_TICK = 20;
export const DART_EARNINGS_DOC_MAX_ATTEMPTS = 3;
/** 본문(일정)을 읽는 IR · 예고는 이 기간 안 접수만 — 확정 일정은 앞으로의 일정에만 쓴다(과거 IR 은 반응을 재지 않는다). 2016~ 이력 4천여 건을 읽지 않게 */
export const DART_EARNINGS_DOC_DAYS = 365;
/** 깨진 본문 다시 받기(`RefetchDartBodies`) — 회차마다. 2b 이후 634건이면 하루 안쪽에 끝난다 */
export const DART_REFETCH_PER_TICK = 20;
/**
 * 다시 받았지만 아직 추출 안 된 본문이 이만큼이면 더 받지 않는다 — 추출은 LLM 하루 몫 안에서만 돌고, 문단은 받은 지 7일이면
 * 지워진다(`AI_BODY_KEEP_MS`). 한꺼번에 634건을 받으면 상당수가 추출 전에 지워져 깨진 본문의 옛 사실이 남는다(2026-11-17 실회차)
 */
export const DART_REFETCH_MAX_PENDING = 20;

const AMEND = /^\s*\[[^\]]*\]/;
const SUBSIDIARY = /자회사의\s*주요경영사항/;
const EARNINGS = /영업\s*\(\s*잠정\s*\)\s*실적|매출액\s*또는\s*손익구조|^\s*(분기|반기|사업)보고서/;
const OUTLOOK = /전망/;

/** 보고서 이름 → 종류. 실적과 무관하면 null */
export const classifyEarningsFiling = (reportName: string): EarningsFilingKind | null => {
  const name = reportName.replace(/\s+/g, " ").trim();
  if (SUBSIDIARY.test(name)) return null;
  if (/기업설명회/.test(name)) return "ir";
  if (/결산실적\s*공시\s*예고/.test(name)) return "preview";
  if (AMEND.test(name)) return null;
  if (OUTLOOK.test(name) || /해외증권거래소/.test(name)) return null;
  return EARNINGS.test(name) ? "earnings" : null;
};

/** 정기보고서 이름의 결산 월 — "분기보고서 (2026.09)" → 2026-09-30. 이름에 없으면 null(예측이 접수일로 고른다) */
export const periodEndFromName = (reportName: string): string | null => {
  const m = reportName.match(/(분기|반기|사업)보고서\s*\((\d{4})\.(\d{2})\)/);
  if (!m) return null;
  const y = Number(m[2]);
  const mo = Number(m[3]);
  if (mo < 1 || mo > 12) return null;
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return `${m[2]}-${m[3]}-${String(last).padStart(2, "0")}`;
};

export interface EarningsSchedule {
  /** 일정 시각(UTC) — 시각을 모르면 그날 09:00 KST(이르게 — 기준 봉이 전 거래일 종가가 된다) */
  scheduledAt: Date;
  timeKnown: boolean;
  /** 실적 발표 일정인가 — 예고는 늘 true, IR 은 목적 · 내용 규칙 */
  aboutEarnings: boolean;
  /** 결산 대상 기간 끝(YYYY-MM-DD) — 예고만 */
  periodEnd: string | null;
}

const DATE = /^(\d{4})[-.](\d{2})[-.](\d{2})\.?$/;
const TIME = /^(\d{1,2}):(\d{2})$/;

const kstAt = (ymd: RegExpMatchArray, hh: number, mm: number) =>
  new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), hh, mm) - 9 * 3_600_000);

/**
 * 실적 IR 인가 — **'개최목적' 칸**에 기간 + 실적("2026년 3분기 경영실적 발표") 또는 "실적 발표 · 설명".
 * 콘퍼런스 · NDR("주요 경영실적 및 관심사")은 아니다 — 삼성전자 · 하나금융 실측(2026-11-13).
 * '주요 설명회내용' 칸은 보지 않는다 — 실적이 나온 뒤 콘퍼런스가 내용에 "2분기 경영실적"을 적는다(기아 CLSA · 신한 MS 표본, 2026-11-17)
 */
const EARNINGS_IR = /((\d\s*분기|반기|상반기|하반기|연간|결산|\d{4}\s*년(도)?)\s*(연결\s*)?(경영\s*)?(잠정\s*)?실적)|실적\s*(발표|설명)|earnings/i;

const monthEnd = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;

/**
 * 글이 적은 결산 끝날 — "2026년 3분기" → 2026-09-30 · "'26년 2분기" · "2026년 상반기 · 반기" → 06-30 · "2026년 연간 · 4분기 · 결산" → 12-31.
 * 연도가 없으면 null(추정하지 않는다). 12월 결산 기준 — 다른 결산 월 회사는 예측이 '다음 결산과 같은가'에서 거른다
 */
export const periodFromText = (text: string): string | null => {
  const y = text.match(/(20\d{2})\s*년|'(\d{2})\s*년/);
  if (!y) return null;
  const year = y[1] ? Number(y[1]) : 2000 + Number(y[2]);
  const q = text.match(/([1-4])\s*분기/);
  if (q) return monthEnd(year, Number(q[1]) * 3);
  if (/상반기|반기/.test(text)) return monthEnd(year, 6);
  if (/연간|결산|사업연도|하반기/.test(text)) return monthEnd(year, 12);
  return null;
};

/** 칸 이름 줄 다음부터 다음 번호 줄 전까지 */
const section = (lines: string[], head: RegExp): string => {
  const i = lines.findIndex((l) => head.test(l));
  if (i < 0) return "";
  const out: string[] = [];
  for (const l of lines.slice(i + 1)) {
    if (/^\d+\.\s/.test(l)) break;
    out.push(l);
  }
  return out.join(" ");
};

/**
 * IR 개최 본문 → 일정. 정정 공시는 정정 표 뒤에 정정 뒤 전체 양식이 붙는다 — **마지막** '1. 일시' 블록을 읽는다.
 * 양식 둘 — 유가(접수번호 8): '1. 일시 및 장소' · '일시' · 날짜 · 시각 / 코스닥(9): '1. 일시' · 머리 줄(행사일 · 시작일 · 시작시간 …) ·
 * 날짜(들) · 시각(들). 그래서 블록 안 **첫 날짜**와 다음 번호 칸 전 **첫 시각**(시작 시각)을 쓴다. 목적 칸 이름도 둘
 * ('3. 개최목적' · '6. 주요 설명회내용' / '4. 실시목적' · '6. 주요내용'). 날짜를 못 읽으면 null(호출부가 다시 시도하지 않게 표시)
 */
export const parseIrSchedule = (paragraphs: string[]): EarningsSchedule | null => {
  const lines = paragraphs.map((p) => p.trim()).filter(Boolean);
  let start = -1;
  lines.forEach((l, i) => {
    if (/^1\.\s*일시/.test(l)) start = i;
  });
  if (start < 0) return null;
  const body = lines.slice(start);
  const next = body.findIndex((l, i) => i > 0 && /^\d+\.\s/.test(l));
  const block = next > 0 ? body.slice(1, next) : body.slice(1);
  const dateAt = block.findIndex((l) => DATE.test(l));
  if (dateAt < 0) return null;
  const date = block[dateAt]!.match(DATE)!;
  const time = block.slice(dateAt + 1).map((l) => l.match(TIME)).find((m) => m !== null) ?? null;
  const hh = time ? Number(time[1]) : 9;
  const mm = time ? Number(time[2]) : 0;
  const timeKnown = !!time && hh < 24 && mm < 60;
  const purpose = section(body, /^\d+\.\s*(개최|실시)\s*목적/);
  const aboutEarnings = EARNINGS_IR.test(purpose);
  return {
    scheduledAt: timeKnown ? kstAt(date, hh, mm) : kstAt(date, 9, 0),
    timeKnown,
    aboutEarnings,
    // 목적이 적은 결산 — 예측은 이것이 다음 결산과 같을 때만 확정 일정으로 쓴다(실적 뒤 NDR 이 다음 결산을 확정하지 않게)
    periodEnd: aboutEarnings ? periodFromText(purpose) : null,
  };
};

/** 결산실적공시 예고 본문 → 일정(예정일 · 결산 기간 끝). 시각은 본문에 없다 */
export const parsePreviewSchedule = (paragraphs: string[]): EarningsSchedule | null => {
  const lines = paragraphs.map((p) => p.trim()).filter(Boolean);
  // 번호 붙은 칸 제목만 — 4번 칸 문장("공시예정일은 당사 사정에 의해 …")을 잡지 않게(한전 2026-11-09 실측). 정정이면 마지막 양식
  let head = -1;
  lines.forEach((l, i) => {
    if (/^\d+\.\s*결산실적\s*공시\s*예정일/.test(l)) head = i;
  });
  if (head < 0) return null;
  const date = lines[head + 1]?.match(DATE);
  if (!date) return null;
  const endIdx = lines.findIndex((l) => l === "종료일");
  const end = endIdx >= 0 ? lines[endIdx + 1]?.match(DATE) : null;
  return {
    scheduledAt: kstAt(date, 9, 0),
    timeKnown: false,
    aboutEarnings: true,
    periodEnd: end ? `${end[1]}-${end[2]}-${end[3]}` : null,
  };
};

export interface DartEarningsFilingRow {
  rceptNo: string;
  stockCode: string;
  reportName: string;
  /** YYYYMMDD */
  rceptDate: string;
  kind: EarningsFilingKind;
  periodEnd: string | null;
}

/** 본문을 읽어야 하는 공시(IR · 예고) */
export interface PendingScheduleDoc {
  rceptNo: string;
  kind: "ir" | "preview";
}

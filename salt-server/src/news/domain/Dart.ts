/**
 * DART 공시(F017 v4 2b · `SRV-REQ-058` 원천 ① · `FC-REQ-026` FR-3 · FR-11~13 중 AI 경로 몫) — 순수 규칙.
 *
 * - 목록은 OpenDART `list.json` 의 **주요사항보고(B) · 거래소 공시(I)** 만. 정기 · 감사보고서(A · F)는 길고 원인 재료가 아니며,
 *   지분공시(D — 임원 · 대량보유)는 사람 · 기관 관계라 예측 온톨로지(`FC-REQ-026` FR-5)의 몫이다
 * - 원문을 받는 공시 = 우리 국내 유니버스 종목(판단 대상 — 상위 N + 보유)만. 사실 추출 LLM 몫(하루 60) 안에 들도록(실측 B+I 하루 약 10건)
 * - 키 `dart:<접수번호>` · 화면 링크는 DART 뷰어(공시 원문 페이지) · 게시 시각은 접수일 0시(KST — 목록에 시각이 없다).
 *   `available_at` 은 우리가 받은 시각(그 뒤 봉부터 — 누수, `FC-REQ-026` FR-9)
 */

export const DART_TYPES = ["B", "I"] as const;
export type DartType = (typeof DART_TYPES)[number];

/** 한 회차에 원문을 받는 상한 · 원문 사이 간격(공식 하루 한도의 50% 안 — 회차 5분 × 이 상한 ≪ 1만) */
export const DART_DOCS_PER_TICK = 20;
export const DART_DOC_GAP_MS = 1_000;
/** 원문을 못 받은 공시를 다시 보는 횟수(프로세스 안) — 넘으면 건너뛴다 */
export const DART_DOC_MAX_ATTEMPTS = 3;
/** 본문 상한 — 사실 추출이 앞 6천 자를 읽는다. 표가 긴 공시도 이만큼만 남긴다 */
export const DART_BODY_MAX_CHARS = 20_000;

export interface DartFiling {
  rceptNo: string;
  stockCode: string;
  corpName: string;
  reportName: string;
  /** YYYYMMDD */
  rceptDate: string;
  filer: string;
}

export const dartKey = (rceptNo: string) => `dart:${rceptNo}`;
export const dartViewerUrl = (rceptNo: string) => `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`;
/** 제목 — 회사 이름 + 보고서 이름(공백 하나로). 사건 종류 사전이 이 글자를 본다 */
export const dartTitle = (f: Pick<DartFiling, "corpName" | "reportName">) => `${f.corpName} ${f.reportName}`.replace(/\s+/g, " ").trim();
/** 접수일(YYYYMMDD) → 그날 0시 KST(UTC 시각) */
export const dartPublishedAt = (rceptDate: string): Date | null => {
  const m = rceptDate.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - 9 * 3_600_000);
};
/** KST 날짜 YYYYMMDD — `daysAgo` 일 전 */
export const kstYmd = (now: Date, daysAgo = 0): string => {
  const d = new Date(now.getTime() + 9 * 3_600_000 - daysAgo * 86_400_000);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
};

/**
 * 공시 원문 HTML → 문단 — 표의 행은 칸을 ` | ` 로 이은 한 줄(숫자가 행 머리와 같이 남게), 문단 · 줄바꿈은 줄. 스타일 · 스크립트 0.
 * 상한에서 자른다. 순수(문자열만)
 */
export const dartParagraphs = (html: string): string[] => {
  const text = html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(td|th|te|tu)>/gi, " | ")
    .replace(/<\/(tr|p|div|h\d|li|title|table)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
  const out: string[] = [];
  let total = 0;
  for (const raw of text.split(/\n/)) {
    const line = raw.replace(/[ \t\r\f\v]+/g, " ").replace(/(\s*\|\s*)+/g, " | ").replace(/^\s*\|\s*|\s*\|\s*$/g, "").trim();
    if (!line || out.at(-1) === line) continue;
    out.push(line);
    total += line.length;
    if (total >= DART_BODY_MAX_CHARS) break;
  }
  return out;
};

// ── 1년 백필 · 공시 목록 사실(F017 v4 2b+ — 사용자 "국내는 적어도 다 나와야지", 2026-11-14) ──────────

/** 종목마다 한 번 받는 과거 목록 길이 — 회사 사정 창의 가장 긴 단(365일)과 같다 */
export const DART_BACKFILL_DAYS = 365;
/** 한 회차에 백필하는 종목 수(종목당 목록 호출 2~4) */
export const DART_BACKFILL_STOCKS_PER_TICK = 10;
/** 과거 공시 원문(숫자 추출용)은 종목마다 최근 · 중요한 것 몇 건만 · 이 기간 안 */
export const DART_BODY_BACKFILL_PER_STOCK = 2;
export const DART_BODY_BACKFILL_DAYS = 120;

/** 원인 · 회사 사정에 쓰는 공시 종류 — 보고서 이름 낱말. 나머지(기업설명회 일정 · 주주명부 · 기타경영사항 …)는 목록 사실로만 */
const IMPORTANT = /실적|매출액|손익구조|단일판매|공급계약|배당|자기주식|자사주|유상증자|무상증자|전환사채|신주인수권|교환사채|합병|분할|최대주주|소송|거래정지|매매거래정지|관리종목|상장폐지|불성실|감자|타법인주식|유형자산|영업양수|영업양도|투자판단|횡령|배임|회생|파산|감사의견/;
export const isImportantFiling = (reportName: string): boolean => IMPORTANT.test(reportName);

/**
 * 목록 사실의 '무엇' — 보고서 이름에서 정정 머리말 · 공백을 걷고 40자. 정정은 끝에 "(정정)"
 * (예: "[기재정정]단일판매ㆍ공급계약체결" → "단일판매ㆍ공급계약체결 (정정)")
 */
export const dartFilingWhat = (reportName: string): string => {
  const amended = /^\s*\[[^\]]*정정[^\]]*\]/.test(reportName);
  const base = reportName.replace(/^\s*(\[[^\]]*\]\s*)+/, "").replace(/\s+/g, " ").trim();
  const what = amended ? `${base} (정정)` : base;
  return what.length > 40 ? `${what.slice(0, 39)}…` : what;
};

/** 공시 목록 한 줄(저장본) — 회사 사정 칸이 사실로 쓴다 */
export interface StoredDartFiling {
  rceptNo: string;
  stockCode: string;
  corpName: string;
  reportName: string;
  rceptDate: string;
  firstSeenAt: Date;
}

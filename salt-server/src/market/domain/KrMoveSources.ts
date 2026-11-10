/**
 * 국내 등락 원천(F016 단계 B · `SRV-REQ-051` FR-1 · 4 · 5) — 시황/공시 제목 · 업종 지수 · 장중 프로그램 매매.
 *
 * 단계 C(등락 분해 · 같은 날 사실)의 재료다. 이 파일은 **원천을 어떻게 받고 무엇을 버리는지**만 갖는다 — 원인 해석 · 문장 0.
 * 기사 본문 · 원문 링크는 원천(KIS)에 없고 우리도 만들지 않는다(`ADR-009` — 저작권 선).
 */

import type { SectorBoardRow } from "./SearchExtras";
import { kstDateOf } from "./KrStock";

// ==================== 시황/공시 제목 (FR-1) ====================

/** 공시(거래소 · 코스닥 공시)와 시황(언론사) — 화면 칩. 제공처 이름에 "공시"가 있으면 공시다(2026-11-05 표본 200건: `G 코스닥 공시` · `I 공시`) */
export type KrNewsKind = "news" | "disclosure";

export const krNewsKindOf = (providerName: string): KrNewsKind => (providerName.includes("공시") ? "disclosure" : "news");

/** KIS 종합 시황/공시 제목 한 건 — 본문 · 링크 없음(원천에 없다) */
export interface KrNewsTitleFact {
  /** 원천 일련번호(`cntt_usiq_srno`) — 유일 */
  serial: string;
  /** 제공처 코드(`news_ofer_entp_code`) · 이름(`dorg`) */
  providerCode: string;
  providerName: string;
  publishedAt: Date;
  title: string;
  /** 대분류(`news_lrdv_code`) — 뜻은 제공처마다 다르다(근거 [약]). 저장만 한다 */
  categoryCode: string | null;
  /** 관련 종목 코드(`iscd1`~`iscd10`) — 빈 칸 뺌 · 중복 뺌 */
  codes: string[];
}

/**
 * 광고성 제목인가 — 패턴은 서버 설정(`KR_NEWS_PROMO_PATTERNS`, 정규식 `|` 묶음). 표시에서만 빼고 행은 남긴다 —
 * 패턴을 고치면 지난 행도 다시 판정할 수 있게(저장된 `promo` 는 그때 판정)
 */
export const isKrNewsPromo = (title: string, patterns: readonly RegExp[]): boolean => patterns.some((p) => p.test(title));

/**
 * 한 회차 연속 조회 상한(한 쪽 40건). 시장 전체 제목이 2026-11-06 장 초반 40건 / 약 1.5분 — 2분 회차면 한두 쪽이다.
 * 맥 수면으로 회차를 놓쳐도 깨어난 회차가 200건(약 8분 · 장외엔 수 시간)까지 메운다. 그 앞은 버린다(소식은 그날 것이 중요하다)
 */
export const KR_NEWS_MAX_PAGES = 5;
/** 보관 일수(`DB-REQ-041` FR-1) — 정리 워커가 나눠 지운다 */
export const KR_NEWS_RETENTION_DAYS = 30;
/** 상세 "오늘 소식" 한 번에 보이는 최대 건수 — 응답 크기 상한(삼성전자 하루 약 40건) */
export const KR_NEWS_READ_LIMIT = 30;

/**
 * 이 분에 제목을 받는가 — 시장 전체 **한 번 호출**이라 종목 수와 무관하다. KST 07:00~20:00 은 2분마다 · 그 밖은 30분마다.
 * (기획서의 "종목마다 장중 5분"보다 호출이 훨씬 적다 — 유니버스 60종목 × 5분 = 12건/분 → 0.5건/분)
 */
export const isKrNewsPollMinute = (now: Date): boolean => {
  const { hour, minute } = kstClock(now);
  return hour >= 7 && hour < 20 ? minute % 2 === 0 : minute % 30 === 0;
};

// ==================== 업종 지수 (FR-4) ====================

/**
 * 마스터의 지수업종 → 업종 지수 코드. **중분류가 있으면 중분류**(0013 전기전자 · 0009 의약품), 없으면 대분류(0021 금융 · 0029 서비스).
 * 대분류만 쓰던 단계 B 판은 "제조업"(0027 — 코스피 556종목, 반도체가 지배)을 업종으로 삼아 제약사의 업종 몫을 반도체로 냈다(2026-11-09 —
 * 동화약품 업종 β −3.5). KIS 업종 현재지수 · 기간별 시세가 같은 코드를 받는다(실측). `0000` 은 분류 없음 · `x001` 은 시장 대표 —
 * 업종 몫 없이 시장 → 종목 두 단. 예측 배치(`kr_sector_index_code`)와 같은 표
 */
export const krSectorIndexCodeOf = (sectorCode: string | null | undefined, midCode?: string | null): string | null => {
  const valid = (c: string | null | undefined): c is string =>
    typeof c === "string" && /^\d{4}$/.test(c) && c !== "0000" && !c.endsWith("001");
  return valid(midCode) ? midCode : valid(sectorCode) ? sectorCode : null;
};

/** 업종 지수 한 번 — 값 · 전일 대비(포인트, 부호) · 등락률(%) */
export interface KrSectorIndexFact {
  code: string;
  value: number;
  change: number;
  changeRate: number;
}

export interface StoredKrSectorIndex extends KrSectorIndexFact {
  tradeDate: string;
  updatedAt: Date;
}

// ==================== 지수 · 업종 일별 이력 (F016 단계 C — β 재료) ====================

/**
 * 시장 지수 셋 — 일별 이력을 업종과 같은 표(`kr_sector_index_daily`)에 둔다. KIS 가 시장 지수를 업종 코드(`0001` · `1001` · `2001`)로 다룬다
 * (같은 TR 이 둘 다 받는다 — 2026-11-09 실측)
 */
export const KR_MARKET_INDEX_CODES = ["0001", "1001", "2001"] as const;
/**
 * 지수마다 갖고 있을 거래일 수 — β 창(120 거래일, 예측 설정) + 여유. 기간별 시세는 한 번에 50거래일(실측)이라 처음 한 번 6쪽,
 * 그 뒤엔 하루 한 쪽(최근 50일 — 맥 수면으로 며칠 놓쳐도 메운다)
 */
export const KR_INDEX_DAILY_SESSIONS = 250;
/**
 * 이보다 적으면 다시 거슬러 받는다 — β(120) + σ(60) 창 + 여유. 목표(250)와 같은 값으로 두면 휴장 · 원천 한 해 끝 때문에 248행에 멈춘
 * 지수를 매일 5쪽씩 다시 받았다(2026-11-09 09:22 — 19지수 95회)
 */
export const KR_INDEX_DAILY_REFILL_BELOW = 200;
/** 기간별 시세 한 쪽 거래일 수(2026-11-09 실측) — 쪽 넘김이 이보다 적게 오면 더 앞이 없다 */
export const KR_INDEX_DAILY_PAGE = 50;

/** 기간별 시세 한 행 — 거래일(KST) · 종가(포인트). 등락률 칸은 원천에 없다(실측) */
export interface KrIndexDailyClose {
  tradeDate: string;
  close: number;
}

export interface KrIndexDailyRow extends KrIndexDailyClose {
  /** 전 거래일 종가 대비(%) — 앞 행이 없으면 행을 만들지 않는다 */
  changeRate: number;
}

/**
 * 종가 목록 → 일별 행. 날짜순으로 놓고 바로 앞 거래일 종가로 등락률을 낸다 — 맨 앞 행은 앞 종가가 없어 버린다(매일 회차의 맨 앞은
 * 약 70일 전이라 이미 저장돼 있고, 처음 채울 땐 1년 앞 한 행이다). 같은 날 두 행이면 뒤의 것
 */
export const krIndexDailyRows = (closes: KrIndexDailyClose[]): KrIndexDailyRow[] => {
  const byDate = new Map<string, number>();
  for (const c of closes) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(c.tradeDate) && Number.isFinite(c.close) && c.close > 0) byDate.set(c.tradeDate, c.close);
  }
  const ordered = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  return ordered.flatMap(([tradeDate, close], i) =>
    i === 0 ? [] : [{ tradeDate, close, changeRate: (close / ordered[i - 1][1] - 1) * 100 }]
  );
};

// ==================== 장중 프로그램 매매 (FR-5) ====================

/**
 * 종목 프로그램 매매 누적(체결 기준) 한 번 — KIS `FHPPG04650101` 최신 행. 금액은 **원**(2026-11-06 실측 삼성전자 순매수
 * `60550831650` = 약 605억 — 투자자 TR 의 백만 원과 다르다). 외국인 · 기관 장중 추정(`FHPTJ04160001`)은 모의 키가 거부해(OPSQ2001,
 * 2026-11-06 11:45) 이번엔 프로그램만 — 실전 키 때 같은 표에 열을 더한다
 */
export interface KrProgramFlowFact {
  code: string;
  /** 체결 시각(그날 KST 벽시계 → 실제 시각) */
  at: Date;
  netQuantity: bigint;
  netValue: number;
  buyValue: number;
  sellValue: number;
}

/** 장중 표 보관 일수(`DB-REQ-041` FR-5) — 하루가 지나면 일별 투자자 표가 정본 */
export const KR_FLOW_INTRADAY_RETENTION_DAYS = 7;
/** VI 사건 보관 일수 — 단계 A 가 남긴 정리(시장 전체 하루 수백 행) */
export const KR_VI_RETENTION_DAYS = 30;
/** 정리 한 번에 지우는 행 수 — 긴 트랜잭션 · 대량 죽은 튜플을 피한다(`performance-database.md` §8) */
export const KR_PRUNE_BATCH = 5_000;


// ==================== Port ====================

/** KIS 등락 원천 조회. **트랜잭션 밖에서 부른다** */
export interface KrMoveSourcePort {
  /**
   * 시장 전체 시황/공시 제목 한 쪽(최신이 앞, 40건). `before` 가 있으면 그 시각(KST 날짜 · hhmmss) 이하부터 — 쪽 넘김.
   * 같은 시각 경계 행은 두 쪽에 겹쳐 올 수 있다(일련번호로 하나로)
   */
  newsTitlesPage(before: { date: string; hhmmss: string } | null): Promise<KrNewsTitleFact[]>;
  /** 업종 현재지수 — 지수 TR 그대로 */
  indexQuote(code: string): Promise<KrSectorIndexFact>;
  /** 종목 프로그램 매매 누적 최신 행. 그날 체결이 없으면 `null` */
  programFlow(code: string): Promise<KrProgramFlowFact | null>;
  /** 지수 · 업종 기간별 일별 종가 — `to` 부터 거슬러 최대 50거래일(최신이 앞). 날짜는 KST `YYYY-MM-DD`. 이름은 원천 값(없으면 `null`) */
  indexDailyCloses(code: string, from: string, to: string): Promise<{ name: string | null; closes: KrIndexDailyClose[] }>;
}

export interface StoredKrNewsTitle {
  serial: string;
  kind: KrNewsKind;
  providerName: string;
  publishedAt: Date;
  title: string;
  /** 관련 종목(원천 `iscd1`~`10`) — 이름 · 지금 등락률(%, 시세가 없으면 `null`). 뉴스 상세 모달 칩(`FE-REQ-065`) */
  related: Array<{ code: string; name: string; changeRate: number | null }>;
}

export interface KrMoveSourceStore {
  /** 일련번호 유일 — 같은 제목은 다시 쓰지 않는다(`ON CONFLICT DO NOTHING`). 관련 종목 연결도 같이 */
  saveNewsTitles(facts: Array<KrNewsTitleFact & { kind: KrNewsKind; promo: boolean }>, at: Date): Promise<number>;
  /** 가장 늦게 받은 제목의 게시 시각 — 쪽 넘김이 어디서 멈출지 */
  latestNewsPublishedAt(): Promise<Date | null>;
  /** 한 종목 `since` 뒤 제목(최신이 앞) · 광고성 제외 · `limit` 건 */
  newsTitles(code: string, since: Date, limit: number): Promise<StoredKrNewsTitle[]>;
  /** 제목 하나 — 그 종목에 걸린 것만(광고성 제외). 기사 본문 찾기(`SRV-REQ-054`)의 입력. 없으면 `null` */
  newsTitle(serial: string, code: string): Promise<{ kind: KrNewsKind; title: string; publishedAt: Date } | null>;
  /** 마지막으로 제목을 받은 시각(신선도) */
  newsCollectedAt(): Promise<Date | null>;
  /** 종목 → 업종 지수 코드(분류 없음은 빠진다) */
  sectorIndexCodes(codes: string[]): Promise<Map<string, string>>;
  /** 최신 값(업종마다 한 행) + 그날 일별 행(장 끝 값이 종가) — 한 문장씩 */
  upsertSectorIndices(facts: KrSectorIndexFact[], at: Date): Promise<void>;
  sectorIndices(codes: string[]): Promise<StoredKrSectorIndex[]>;
  /** 업종 지수 최신 값 전부 + 원천 이름(없으면 `null`) — 뜨는 업종 · 업종 검색(`SRV-REQ-055`). 20행 안팎 */
  sectorBoard(): Promise<SectorBoardRow[]>;
  /** 제목에 검색어가 든 시황 · 공시(`since` 뒤 · 최신순 · 광고성 제외) — 검색 모달 뉴스 묶음(`SRV-REQ-055`) */
  searchNewsTitles(q: string, since: Date, limit: number): Promise<StoredKrNewsTitle[]>;
  /** 일별 행 덮어쓰기(원천 공식 종가가 장중 마지막 값을 이긴다) — 한 문장 */
  upsertIndexDaily(code: string, rows: KrIndexDailyRow[], at: Date): Promise<void>;
  /** 지수 이름(원천 값) — 덮어쓴다 */
  upsertIndexNames(names: Array<{ code: string; name: string }>, at: Date): Promise<void>;
  indexNames(codes: string[]): Promise<Map<string, string>>;
  /** 지수마다 저장된 일별 행 수 · 가장 이른 · 늦은 거래일과 그 종가 */
  indexDailyCoverage(
    codes: string[]
  ): Promise<Map<string, { count: number; earliest: KrIndexDailyClose; latest: KrIndexDailyClose }>>;
  /** (종목 · 체결 시각) 유일 — 같은 회차 다시 받아도 행이 늘지 않는다 */
  appendProgramFlows(facts: KrProgramFlowFact[], at: Date): Promise<void>;
  /** 한 종목 `since` 뒤 가장 최근 프로그램 누적 */
  latestProgramFlow(code: string, since: Date): Promise<(KrProgramFlowFact & { collectedAt: Date }) | null>;
  /** 보관 기한 지난 행을 `KR_PRUNE_BATCH` 씩 나눠 지운다. 지운 행 수 */
  prune(cutoffs: { news: Date; flows: Date; viEvents: Date }): Promise<{ news: number; flows: number; viEvents: number }>;
}

// ==================== 시각 ====================

const kstClock = (now: Date) => {
  const kst = new Date(now.getTime() + 9 * 3_600_000);
  return { hour: kst.getUTCHours(), minute: kst.getUTCMinutes() };
};

/** KST 그날 00:00 — "오늘 소식"의 시작 */
export const kstStartOfDay = (now: Date): Date => new Date(`${kstDateOf(now)}T00:00:00+09:00`);


/** 기사 본문(`SRV-REQ-054`) — `news` 컨텍스트를 우리 언어로 번역하는 ACL 의 Port. 문단은 글자만 · 키가 없으면 503 이 그대로 오른다 */
export interface KrArticleBodyPort {
  read(query: { key: string; title: string; publishedAt: Date }): Promise<KrArticleBodyView>;
}

export interface KrArticleBodyView {
  status: "ok" | "not_found" | "failed";
  paragraphs: string[];
  originalUrl: string | null;
  fetchedAt: string;
}

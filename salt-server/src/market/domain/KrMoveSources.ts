/**
 * 국내 등락 원천(F016 단계 B · `SRV-REQ-051` FR-1 · 4 · 5) — 시황/공시 제목 · 업종 지수 · 장중 프로그램 매매.
 *
 * 단계 C(등락 분해 · 같은 날 사실)의 재료다. 이 파일은 **원천을 어떻게 받고 무엇을 버리는지**만 갖는다 — 원인 해석 · 문장 0.
 * 기사 본문 · 원문 링크는 원천(KIS)에 없고 우리도 만들지 않는다(`ADR-009` — 저작권 선).
 */

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
 * 마스터의 지수업종 대분류(`sector_code`) → 업종 지수 코드. KIS 업종 현재지수가 같은 코드를 받는다(2026-11-06 실측 `0027` 제조 ·
 * `1009` · `0021` 금융). `0000` 은 분류 없음 — 업종 몫 없이 시장 → 고유 두 단으로 나뉜다(단계 C)
 */
export const krSectorIndexCodeOf = (sectorCode: string | null | undefined): string | null =>
  typeof sectorCode === "string" && /^\d{4}$/.test(sectorCode) && sectorCode !== "0000" && !sectorCode.endsWith("001")
    ? sectorCode
    : null;

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
}

export interface StoredKrNewsTitle {
  serial: string;
  kind: KrNewsKind;
  providerName: string;
  publishedAt: Date;
  title: string;
}

export interface KrMoveSourceStore {
  /** 일련번호 유일 — 같은 제목은 다시 쓰지 않는다(`ON CONFLICT DO NOTHING`). 관련 종목 연결도 같이 */
  saveNewsTitles(facts: Array<KrNewsTitleFact & { kind: KrNewsKind; promo: boolean }>, at: Date): Promise<number>;
  /** 가장 늦게 받은 제목의 게시 시각 — 쪽 넘김이 어디서 멈출지 */
  latestNewsPublishedAt(): Promise<Date | null>;
  /** 한 종목 `since` 뒤 제목(최신이 앞) · 광고성 제외 · `limit` 건 */
  newsTitles(code: string, since: Date, limit: number): Promise<StoredKrNewsTitle[]>;
  /** 마지막으로 제목을 받은 시각(신선도) */
  newsCollectedAt(): Promise<Date | null>;
  /** 종목 → 업종 지수 코드(분류 없음은 빠진다) */
  sectorIndexCodes(codes: string[]): Promise<Map<string, string>>;
  /** 최신 값(업종마다 한 행) + 그날 일별 행(장 끝 값이 종가) — 한 문장씩 */
  upsertSectorIndices(facts: KrSectorIndexFact[], at: Date): Promise<void>;
  sectorIndices(codes: string[]): Promise<StoredKrSectorIndex[]>;
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


/**
 * 검색 모달 2단계(`SRV-REQ-055` · `FE-REQ-066` FR-8) — 업종 · 지수 · 뉴스 결과 묶음, 뜨는 업종, 곁 칸(관련 종목)의 **순수 규칙**.
 *
 * 몇 개를 보여 줄지 · 얼마나 지난 것까지 볼지를 여기서 정한다(서버 소유 — 프론트 상수 금지, `done-checklist` §2-2).
 * 원천은 전부 이미 모으는 것이다: 업종 지수(`kr_sector_index_quote` · `kr_index_name`) · 국내 시황 제목(`kr_news_title`) ·
 * 코인 기사 태그(`news_articles.symbols`) · 시장 지수(`kr_index_quotes`).
 */

import { KR_MARKET_INDEX_CODES } from "./KrMoveSources";
import { KR_INDEX_NAMES } from "./KrSupplement";

/** 뜨는 업종 첫 화면 줄 수 */
export const RISING_SECTOR_DEFAULT_LIMIT = 5;
export const RISING_SECTOR_MAX_LIMIT = 20;
/** 결과 묶음 — 업종 · 뉴스 줄 수 */
export const SEARCH_SECTOR_LIMIT = 5;
export const SEARCH_NEWS_LIMIT = 6;
/** 뉴스 결과는 일주일 안 제목만 — 검색 모달은 "지금" 을 찾는 곳이다(국내 제목 보존 30일 중) */
export const SEARCH_NEWS_WINDOW_DAYS = 7;
/** 곁 칸 — 고른 종목의 같은 업종 종목 수 · 고른 업종의 구성 종목 수 · 코인 함께 태그된 코인 수 */
export const RELATED_PEER_LIMIT = 3;
export const RELATED_MEMBER_LIMIT = 5;
/** 코인 함께 태그 — 기사가 국내 제목보다 드물어(주 170건 남짓, 2026-11-10 실측) 30일을 본다 */
export const RELATED_CO_TAG_WINDOW_DAYS = 30;

/**
 * 시장 지수 별칭 — 이름(`KR_INDEX_NAMES`) 말고도 영문 · 붙여 쓴 것으로 찾는다. 이름은 서버가 정한다(위 표)
 */
const KR_INDEX_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "0001": ["KOSPI", "종합"],
  "1001": ["KOSDAQ"],
  "2001": ["KOSPI200", "KOSPI 200", "코스피200"],
};

/** 비교용 — 공백 · 가운뎃점을 지우고 대문자로("전기 전자" = "전기·전자") */
const bare = (text: string) => text.replace(/[\s·・.,/\-]+/g, "").toUpperCase();

/** 검색어가 이름(또는 별칭)의 일부인가. 빈 검색어는 아무것도 맞지 않는다 */
export const matchesName = (q: string, ...names: readonly string[]): boolean => {
  const needle = bare(q);
  return needle !== "" && names.some((name) => bare(name).includes(needle));
};

/**
 * 검색어에 맞는 시장 지수 코드 — 코스피 · 코스닥 · 코스피 200 순(`KR_MARKET_INDEX_CODES`). `Object.keys(KR_INDEX_NAMES)` 를 쓰지 않는다 —
 * 숫자 모양 키("1001")가 "0001" 보다 먼저 나온다
 */
export const matchKrIndexCodes = (q: string): string[] =>
  KR_MARKET_INDEX_CODES.filter((code) => matchesName(q, KR_INDEX_NAMES[code]!, ...(KR_INDEX_ALIASES[code] ?? [])));

/** 업종 한 줄(원천 값) */
export interface SectorBoardRow {
  code: string;
  /** 원천 이름 — 없으면 `null`(그 업종은 화면에 내지 않는다) */
  name: string | null;
  tradeDate: string;
  changeRate: number;
  updatedAt: Date;
}

export interface SectorView {
  code: string;
  name: string;
  changeRate: number;
  /** 그 값을 받은 시각 */
  asOf: Date;
}

/**
 * 화면에 낼 업종 — **가장 늦은 거래일 값만**(지난 날에 멈춘 업종은 오늘 순위에 끼지 않는다 — 2026-11-10 `0027` 이 11-06 값으로
 * 남아 −7% 로 꼴찌에 섰다) · 이름이 있는 것만 · 등락률 높은 순(같으면 코드 순 — 순서가 매번 같게)
 */
export const currentSectors = (rows: readonly SectorBoardRow[]): SectorView[] => {
  const latest = rows.reduce<string | null>((max, r) => (max === null || r.tradeDate > max ? r.tradeDate : max), null);
  return rows
    .filter((r): r is SectorBoardRow & { name: string } => r.tradeDate === latest && !!r.name && Number.isFinite(r.changeRate))
    .map((r) => ({ code: r.code, name: r.name, changeRate: r.changeRate, asOf: r.updatedAt }))
    .sort((a, b) => b.changeRate - a.changeRate || a.code.localeCompare(b.code));
};

/** 목록의 기준 시각 — 가장 늦은 값. 비면 `null` */
export const latestAsOf = (rows: ReadonlyArray<{ asOf: Date }>): Date | null =>
  rows.reduce<Date | null>((max, r) => (max === null || r.asOf > max ? r.asOf : max), null);

/**
 * 함께 태그된 코인 — 고른 코인이 붙은 기사들의 다른 태그를 센다. 많이 함께 나온 순 · 같으면 심볼 순. 자기 자신은 뺀다
 */
export const rankCoTagged = (symbol: string, tagLists: ReadonlyArray<readonly string[]>, limit: number): string[] => {
  const self = symbol.toUpperCase();
  const counts = new Map<string, number>();
  for (const tags of tagLists) {
    for (const tag of new Set(tags.map((t) => t.toUpperCase()))) {
      if (tag !== self) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
};

/** 등락률 높은 순(값 없으면 뒤) · 같으면 코드 순 */
export const byChangeRateDesc = <T extends { symbol: string; changeRate: number | null }>(a: T, b: T): number =>
  (b.changeRate ?? -Infinity) - (a.changeRate ?? -Infinity) || a.symbol.localeCompare(b.symbol);

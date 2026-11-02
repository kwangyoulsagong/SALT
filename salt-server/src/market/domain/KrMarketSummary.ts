/**
 * 국내 주식 시장 요약 띠(`SRV-REQ-042`) — 코인 요약(`MarketSummary.ts`)과 같은 모양 · 같은 판정 함수.
 *
 * **무엇을 보일지는 서버가 정한다.** 대표 · 지수 칸은 설정(`KR_SUMMARY_*`), 나머지 칸은 수집 유니버스 순서(보유 → 관심 →
 * 시총)에서 채운다 — 유니버스 앞쪽이라 5분봉 · 현재가 수집이 이미 그 종목부터 돈다(FR-4).
 */
import type { MarketBreadth } from "./MarketSummary";

/** 장중 한 점 — 지수 분 기록 · 종목 5분봉 종가 */
export interface KrIntradayPoint {
  at: Date;
  value: number;
}

/** 설정값(`KR_SUMMARY_FEATURED` · `KR_SUMMARY_ITEMS` · `KR_SUMMARY_WIDE_MOVE_RATE`) — 코드 상수가 아니다 */
export interface KrSummaryPolicy {
  /** 큰 차트의 대표 — 지수 코드 */
  featured: string;
  /** 작은 칸 앞자리 지수 코드(설정 순서 = 화면 순서) */
  indexItems: string[];
  /** `wide_move` 임계(전일 대비 변동률 %, 절댓값) */
  wideMoveRate: number;
}

/** 작은 칸 수 — 코인 띠와 같은 3×3 */
export const KR_SUMMARY_SLOTS = 9;

/** 다가오는 국내 일정 몇 건 — 코인 띠의 뉴스 세 줄 자리 */
export const KR_SUMMARY_SCHEDULE_COUNT = 3;
/** 일정을 찾는 창(일) — 일정 경로 상한과 같다. 3건이 차면 그 앞에서 끝난다 */
export const KR_SUMMARY_SCHEDULE_DAYS = 35;

/** 스파크라인 해상도(분) — 지수 분 기록을 종목 5분봉과 같은 간격으로 줄인다(점 390 → 78) */
export const KR_SPARKLINE_BUCKET_MINUTES = 5;

/** 정규장 길이(분) — 09:00 ~ 15:30. 스파크라인 창 이름("장중")의 근거 */
export const KR_REGULAR_SESSION_MINUTES = 390;

/** 지수 칸 · 대표가 아닌 종목 칸 — 유니버스 순서 앞에서 남은 자리만큼. 지수 코드와 겹치는 것은 없다(6자리 vs 4자리) */
export const pickKrSummaryStocks = (universe: string[], indexSlots: number): string[] =>
  universe.slice(0, Math.max(0, KR_SUMMARY_SLOTS - indexSlots));

/**
 * 오늘의 시장 — 지수 행의 상승 · 보합 · 하락 종목 수를 더한다(코스피 + 코스닥 = 시장 전체). 세는 것은 거래소다.
 * 수가 하나도 없으면 `null`(빈 막대를 그리지 않는다)
 */
export const krBreadthOf = (
  rows: Array<{ advancers: number | null; unchanged: number | null; decliners: number | null }>
): MarketBreadth | null => {
  const counted = rows.filter((r) => r.advancers !== null && r.unchanged !== null && r.decliners !== null);
  if (counted.length === 0) return null;
  const up = counted.reduce((s, r) => s + (r.advancers ?? 0), 0);
  const flat = counted.reduce((s, r) => s + (r.unchanged ?? 0), 0);
  const down = counted.reduce((s, r) => s + (r.decliners ?? 0), 0);
  const total = up + flat + down;
  return total > 0 ? { up, flat, down, total } : null;
};

/**
 * 분 기록 → `minutes` 칸마다 마지막 값(시간순). 칸은 UTC 분을 `minutes` 로 나눈 몫 — KST 09:00 은 5 의 배수라 칸 경계가 같다.
 * 점이 둘보다 적으면 선이 아니다 → `null`
 */
export const bucketLastValues = (points: KrIntradayPoint[], minutes: number): number[] | null => {
  const buckets = new Map<number, number>();
  for (const p of [...points].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    buckets.set(Math.floor(p.at.getTime() / (minutes * 60_000)), p.value);
  }
  const values = [...buckets.values()];
  return values.length >= 2 ? values : null;
};

/** 스파크라인이 그린 날(KST, `YYYY-MM-DD`) — 마지막 점 기준. 화면이 "오늘 장중" · "10/31 장중" 을 고른다 */
export const krSessionDateOf = (points: KrIntradayPoint[] | undefined): string | null => {
  const last = points?.reduce<Date | null>((m, p) => (!m || p.at > m ? p.at : m), null);
  return last ? new Date(last.getTime() + 9 * 3_600_000).toISOString().slice(0, 10) : null;
};

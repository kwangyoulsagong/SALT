import type { ArticleDraft } from "./Article";

/**
 * 잠든 동안 빈 날 메우기(`SRV-REQ-057` FR-8) — 한글 검색 피드 10개만.
 *
 * 맥이 평일 업무 시간에만 켜진다(2026-11-16 결정 — 한계 수용). 검색 RSS 는 최근 항목만 주므로 잠든 동안 나온 기사는
 * 영영 빠졌다(소식 실험 `move-news` 의 "소식 있음" 10건 중 7건이 잠든 시간 기사). 검색은 `after:` · `before:` 날짜를
 * 받아 하루씩 다시 찾으면 그날 기사가 최대 100건 온다(2026-11-16 확인). 영어 매체 RSS 는 날짜 검색이 없어 못 메운다.
 *
 * ## 불변식
 *
 * **마지막 성공 수집이 `NEWS_GAP_AFTER_MS` 넘게 지났으면, (마지막 성공 − 하루)의 UTC 날짜부터 오늘까지 매일을 다시 검색한다
 * — 최대 `NEWS_GAP_CAP_DAYS` 일 전까지.** 기록이 없으면(첫 수집) 메우지 않는다 — 과거 백필은 이 일의 몫이 아니다.
 *
 * - 앞뒤 하루 겹침: 검색 날짜 경계가 UTC 가 아니다(2026-11-16 응답이 08:00 UTC 경계). 같은 기사는 주소로 한 번만 저장된다
 * - 받은 시각(`created_at`)은 실제로 받은 지금 — 소급하지 않는다. 늦게 안 기사는 늦게 안 것으로 남는다
 * - 규칙은 예측 수집(`salt-forecast` `ingest/rss.py` `gap_days`)과 같다 — 같은 원장에 두 갈래 규칙이 없게
 */
export const NEWS_GAP_AFTER_MS = 2 * 3_600_000; // 매시 수집이 한 번 빠진 정도는 30건 안에 든다
export const NEWS_GAP_CAP_DAYS = 14;
/** (검색어, 하루) 한 번에 받는 최대 건수 — 정기 회차는 30 */
export const NEWS_GAP_PER_FEED = 100;

const DAY_MS = 86_400_000;
const utcDay = (t: number) => Math.floor(t / DAY_MS);
const iso = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);

/** 메울 날(UTC `YYYY-MM-DD`, 오름차순). 메울 것이 없으면 빈 배열 */
export const newsGapDays = (lastOk: Date | null, now: Date): string[] => {
  if (lastOk === null || now.getTime() - lastOk.getTime() < NEWS_GAP_AFTER_MS) return [];
  const today = utcDay(now.getTime());
  const first = Math.max(utcDay(lastOk.getTime() - DAY_MS), today - NEWS_GAP_CAP_DAYS);
  const days: string[] = [];
  for (let d = first; d <= today; d++) days.push(iso(d));
  return days;
};

/** 다음 날(UTC `YYYY-MM-DD`) — 검색 `before:` 경계 */
export const nextIsoDay = (day: string): string => iso(utcDay(Date.parse(`${day}T00:00:00Z`)) + 1);

/** 하루치 다시 검색 결과 — 실패(받기 · 해석 실패)한 검색어 수를 같이 준다. 빈 결과는 실패가 아니다 */
export interface NewsDayResult {
  items: ArticleDraft[];
  failed: number;
}

/**
 * 한글 검색 피드를 날짜 하나로 다시 받는다 — 정기 피드와 같은 `source` 이름 · 같은 종목 · 감성 규칙.
 * 검색어마다 한 요청을 차례로(≈1건/s) 보내 하루에 10초 남짓 걸린다 — 트랜잭션 밖에서 부른다
 */
export interface NewsGapFeedPort {
  fetchKoreanDay(day: string): Promise<NewsDayResult>;
}

/** 마지막 성공 수집의 기록 — 프로세스가 새로 뜰 때 한 번만 읽는다(그 뒤는 메모리) */
export interface NewsGapLedger {
  /** 한글 검색 피드 기사를 마지막으로 **받아 넣은** 시각(`created_at` — 게시 시각이 아니다). 기사가 없으면 `null` */
  lastKoreanFetchedAt(): Promise<Date | null>;
}

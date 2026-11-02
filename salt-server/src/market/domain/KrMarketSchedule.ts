import { DomainError, ErrorKind } from "../../shared/domain";

/**
 * 다가오는 국내 시장 일정 — F008 슬라이스 24 `SRV-REQ-041` FR-5 · `FC-REQ-021`.
 *
 * **일정은 공개 사실이다** — 날짜 · 종류 · 남은 날만 싣고 과거 반응 분포(전망, 소유자 전용)는 싣지 않는다. 그래서
 * 소유자 검사가 없고, 국내 주식 기능(KIS 키)이 꺼져 있어도 동작한다 — 일정은 예측 DB(`forecast.v_upcoming_event`)에서 온다.
 * 보일 종류 · 기간 상한은 여기서 정한다(프론트 상수 0, `FE-REQ-046` FR-6).
 */
export type KrScheduleKind = "kr_bok_rate" | "kr_cpi" | "kr_trade" | "kr_quad_expiry";
export const KR_SCHEDULE_KINDS: readonly KrScheduleKind[] = ["kr_bok_rate", "kr_cpi", "kr_trade", "kr_quad_expiry"];
export const KR_SCHEDULE_MAX_DAYS = 35;
export const KR_SCHEDULE_DEFAULT_DAYS = 14;

export interface UpcomingEventRow {
  kind: string;
  eventAt: Date;
  /** 시장 일정 `''` · 종목 사건 = 종목 코드(2단계) */
  eventSymbol: string;
}

export interface KrScheduleItem {
  kind: KrScheduleKind;
  eventAt: string;
  /** KST 달력 날짜 차이 — 0 = 오늘 */
  daysUntil: number;
}

export interface KrScheduleView {
  days: number;
  items: KrScheduleItem[];
}

/** 예측 DB 를 읽을 수 없다 → 503 — 화면은 일정 줄을 숨긴다(`FE-REQ-046` FR-5) */
export class MarketScheduleUnavailableError extends DomainError {
  constructor() {
    super("MARKET_SCHEDULE_UNAVAILABLE", ErrorKind.Unavailable, "market_schedule_unavailable");
  }
}

const KST_MS = 9 * 3_600_000;
const DAY_MS = 86_400_000;
const kstDay = (at: Date): number => Math.floor((at.getTime() + KST_MS) / DAY_MS);

/** 시장 일정만 · 지나지 않은 것만 · `now` 부터 `days` 일 안. 시각 오름차순 */
export const toKrSchedule = (rows: UpcomingEventRow[], now: Date, days: number): KrScheduleView => {
  const until = now.getTime() + days * DAY_MS;
  const items = rows
    .filter(
      (r) =>
        r.eventSymbol === "" &&
        KR_SCHEDULE_KINDS.includes(r.kind as KrScheduleKind) &&
        r.eventAt.getTime() >= now.getTime() &&
        r.eventAt.getTime() < until
    )
    .sort((a, b) => a.eventAt.getTime() - b.eventAt.getTime())
    .map((r) => ({
      kind: r.kind as KrScheduleKind,
      eventAt: r.eventAt.toISOString(),
      daysUntil: kstDay(r.eventAt) - kstDay(now),
    }));
  return { days, items };
};

import type { MarketChartPreviewItem } from "../model/types";

/** 서버 봉 시각은 `candle_date_time_kst` — 시간대 표기가 없는 KST 문자열이다 */
const KST_OFFSET = "+09:00";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
/** `2026-09-22T11:50:00` · `2026-09-22 11:50:00` — 시간대 표기가 없는 모양 */
const NAIVE_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/**
 * 봉 시각 → epoch ms (`FE-REQ-034` FR-61).
 *
 * **시간대가 없는 문자열을 `new Date()` 에 그대로 넣지 않는다** — 브라우저 시간대로 읽혀서 뉴욕
 * 브라우저에서는 봉이 13시간 밀린다. 표기가 없으면 KST 로 못박는다. 숫자(ms)는 그대로.
 */
export const candleTimeMs = (timestamp: string | number): number => {
  if (typeof timestamp === "number") return timestamp;
  const iso = NAIVE_TIMESTAMP.test(timestamp)
    ? `${timestamp.replace(" ", "T")}${KST_OFFSET}`
    : timestamp;
  return Date.parse(iso);
};

const pad = (n: number) => String(n).padStart(2, "0");

/** epoch ms → 서버와 같은 모양의 KST 문자열(시간대 표기 없음) */
export const toKstTimestamp = (ms: number): string => {
  const d = new Date(ms + KST_OFFSET_MS);
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
};

/** BFF WS 봉 — `timestamp` 가 봉 시작 epoch ms 다(`bff/src/builder/candleBuilder.builder.ts`) */
export interface RealtimeCandle {
  timestamp: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 실시간 봉을 조회 봉 배열(오래된 것부터)에 합친다 (`FE-REQ-034` FR-62 · FR-63).
 *
 * ## 이전 코드는 틱마다 봉을 붙였다
 *
 * REST 시각(KST 문자열)과 WS 시각(ms 숫자)을 `===` 로 비교해 **한 번도 같지 않았다** — 같은 봉의
 * 틱이 올 때마다 새 봉이 붙고 가장 오래된 봉이 빠졌다. 둘을 ms 로 맞춰 비교한다.
 *
 * - **같은 봉**: 종가 · 고가(max) · 저가(min). **시가는 조회 값을 지킨다** — BFF 봉의 시가는 BFF 가
 *   켜진 뒤 첫 틱이라 봉 중간값일 수 있다. 거래량도 BFF 는 켜진 뒤 누계라 두 값 중 큰 값
 * - **다음 봉**: 붙이고 가장 오래된 봉을 버린다(창 크기 고정 — `canvas.md` 메모리 규칙)
 * - **더 옛 봉**: 버린다(늦게 온 메시지)
 *
 * 바뀐 것이 없으면 **같은 배열**을 돌려준다 — React Query 가 구독자를 깨우지 않는다.
 */
export const mergeRealtimeCandle = (
  prev: MarketChartPreviewItem[],
  candle: RealtimeCandle,
): MarketChartPreviewItem[] => {
  const last = prev[prev.length - 1];
  if (!last) return prev;
  const time = candleTimeMs(candle.timestamp);
  const lastTime = candleTimeMs(last.timestamp);
  if (!Number.isFinite(time) || time < lastTime) return prev;

  if (time === lastTime) {
    const next: MarketChartPreviewItem = {
      ...last,
      high: Math.max(last.high, candle.high, candle.close),
      low: Math.min(last.low, candle.low, candle.close),
      close: candle.close,
      volume: Math.max(last.volume, candle.volume),
    };
    if (
      next.high === last.high &&
      next.low === last.low &&
      next.close === last.close &&
      next.volume === last.volume
    ) {
      return prev;
    }
    const out = prev.slice();
    out[out.length - 1] = next;
    return out;
  }

  const appended: MarketChartPreviewItem = {
    timestamp: toKstTimestamp(time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  };
  return [...prev.slice(1), appended];
};

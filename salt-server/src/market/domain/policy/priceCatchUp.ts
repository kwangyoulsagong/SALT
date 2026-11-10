/**
 * 5분봉 따라잡기 규칙(`SRV-REQ-057` FR-2 · `DB-REQ-044` FR-2).
 *
 * **채운 위치(mark)** = "이 시각 전의 봉은 거래소에 물어봤다". 봉이 있나로 구멍을 세면 거래 없는 5분(업비트는 봉을 만들지
 * 않는다)이 영원히 구멍이라, 물어본 구간을 적는다.
 *
 * - 정기 수집(최신 200개)은 받은 창이 위치에 **닿을 때만** 위치를 앞으로 옮긴다 — 16시간 40분보다 길게 자고 깨면 창이 위치에
 *   닿지 않아 위치가 그대로 남고, 그 사이를 따라잡기가 메운다
 * - 따라잡기는 위치에서 **앞으로** 200칸씩(`to` = 위치 + 1000분) — 쪽마다 위치가 옮겨져 회차 상한에 잘려도 다음 회차가 잇는다
 * - 위치가 없는 종목은 보관 창(30일) 시작부터 — 처음 한 번 그동안의 구멍까지 메운다
 */

/** 거래소가 한 번에 주는 분봉 수 — 요청 288 은 말없이 200 으로 잘린다(2026-11-10 실호출) */
export const CANDLE_PAGE = 200;
export const FIVE_MINUTE_MS = 5 * 60_000;
/** 한 쪽이 덮는 시간 — 200 × 5분 = 16시간 40분 */
export const FIVE_MINUTE_PAGE_MS = CANDLE_PAGE * FIVE_MINUTE_MS;
/** 5분봉 보관 창과 같다(`SyncMarketData` `RETENTION`) — 이보다 앞은 받아도 지운다 */
export const FIVE_MINUTE_RETENTION_MS = 30 * 24 * 3600_000;
/** 회차마다 거래소 호출 상한 — 8건/s 페이서에서 약 75초. 장중 API 와 정기 수집이 거래소 한도를 같이 쓴다 */
export const CATCH_UP_CALLS_PER_RUN = 600;

/** 따라잡기를 시작할 시각 — 위치가 없거나 보관 창보다 앞이면 창 시작 */
export const catchUpStart = (mark: Date | undefined, now: Date): Date => {
  const floor = now.getTime() - FIVE_MINUTE_RETENTION_MS;
  return new Date(Math.max(mark?.getTime() ?? floor, floor));
};

/** 정기 수집 한 쪽(최신 `CANDLE_PAGE` 개)이 위치를 옮길 수 있나 — 옮길 수 있으면 새 위치(가장 새 봉의 시작), 아니면 `null` */
export const regularWindowAdvance = (
  mark: Date | undefined,
  candleStarts: readonly Date[]
): Date | null => {
  if (!mark || candleStarts.length === 0) return null;
  const times = candleStarts.map((t) => t.getTime());
  const newest = Math.max(...times);
  // 덜 왔으면 거래소 이력 끝에 닿았다 — 창이 처음부터 덮는다
  const reaches = candleStarts.length < CANDLE_PAGE || Math.min(...times) <= mark.getTime();
  return reaches && newest > mark.getTime() ? new Date(newest) : null;
};

/** 따라잡기가 할 일이 있나 — 위치가 정기 수집 창 밖으로 밀렸다(창 안이면 정기 수집이 옮긴다) */
export const needsCatchUp = (mark: Date | undefined, now: Date): boolean =>
  !mark || now.getTime() - mark.getTime() > FIVE_MINUTE_PAGE_MS;

/** 순서 — 보유 · 관심 → 거래대금 상위 → 나머지. 겹치면 앞 자리 */
export const catchUpOrder = (...groups: ReadonlyArray<readonly string[]>): string[] => [
  ...new Set(groups.flat().map((s) => s.toUpperCase())),
];

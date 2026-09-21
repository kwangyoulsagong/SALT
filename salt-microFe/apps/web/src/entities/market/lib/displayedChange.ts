import { MarketOverviewItem, MarketPeriod } from "../model/types";

/**
 * 표의 "변동률" 칸에 무엇을 쓰는가.
 *
 * - 실시간 — `change24h`. WS 가 틱마다 이 필드를 덮어쓰므로 살아 움직인다
 * - 그 외 — 서버가 계산한 `periodChange`. 틱마다 바뀌는 값이 아니라 WS 가 건드리지 않는다
 *
 * 실시간일 때 `periodChange` 를 쓰지 않는 이유: 응답 시점 값에 멈춰 WS 갱신이 안 보인다.
 * 둘을 한 필드로 합치지 않은 이유는 서버 `MarketOverviewItem` 주석에 있다.
 */
export const displayedChange = (
  item: Pick<MarketOverviewItem, "change24h" | "periodChange">,
  period: MarketPeriod
): number | null =>
  period === MarketPeriod.Realtime ? item.change24h : item.periodChange;

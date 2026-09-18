/**
 * 관심 종목 뷰모델 매핑 — **순수 함수**.
 *
 * ## 왜 서비스에서 떼어냈나
 *
 * `app-watchlist.service` 는 `upbit-ws.service` 를 import 하고, 그 모듈은 **최상위에서
 * Upbit WebSocket 에 접속한다.** 서비스를 테스트하려고 import 하면 테스트가 외부 소켓을
 * 연다. 판정 규칙(어느 시세를 쓰나 · 언제 지연인가)만 여기로 내리면 그 규칙을
 * **네트워크 없이** 검증할 수 있다.
 *
 * 여기에는 import 가 없다. 그게 이 파일의 조건이다.
 */

/**
 * 관심 종목 화면 계약 (`BFF-REQ-008`).
 *
 * **BFF 가 소유한 뷰모델이다.** 서버가 주는 `priceChange24h` 를 화면 이름(`changeRate`)
 * 으로 옮기고, 이 값이 얼마나 오래됐는지를 `priceStale` 한 개의 불리언으로 접는다 —
 * 화면이 시각을 빼서 임계값과 비교하는 일을 하지 않게 한다 (`bff-architecture.md` §2).
 */
export interface WatchlistItemVM {
  id: string;
  assetType: string;
  symbol: string;
  name: string;
  /** 없으면 `null`. **0 을 내려보내지 않는다** — 0 은 "가격이 0원"으로 읽힌다 */
  currentPrice: number | null;
  changeRate: number | null;
  /** 이 값이 실시간이 아니다. 가격이 없을 때도 `true` 다 */
  priceStale: boolean;
  /** 크립토만 있다. 주식은 `null` — 플레이스홀더를 만들지 않는다. 화면이 판단한다 */
  logoUrl: string | null;
  priceUpdatedAt: string | null;
}

export interface ServerWatchlistItem {
  id: string;
  assetType: string;
  symbol: string;
  name: string;
  currentPrice: number | null;
  priceChange24h: number | null;
  priceUpdatedAt: string | null;
  logoUrl: string | null;
}

/**
 * 실시간 캐시 한 줄.
 *
 * **이 캐시는 프로세스마다 따로다.** 구독(`subscribe`)을 부르는 것은
 * `price-updater.worker` 이고 그것은 별도 프로세스(`npm run dev:worker`)다. 그래서
 * REST 프로세스만 띄우면 이 캐시는 **비어 있다** — 그때도 답이 맞아야 하므로
 * 신선도를 캐시 적중이 아니라 **돌려주는 값의 나이**로 판정한다. 캐시는 서버 값보다
 * 새로울 때만 이긴다.
 */
export interface CachedPrice {
  symbol: string;
  currentPrice: number;
  change24h: number;
  timestamp: Date;
}

/**
 * 이 나이를 넘으면 실시간이 아니다.
 *
 * `price-updater.worker` 가 **5초마다** 캐시를 DB 로 밀어 넣는다. 60초는 그 주기의
 * 12배다 — 한두 번 거른 것을 "지연"으로 부르지 않으면서 워커가 죽은 것은 잡아낸다.
 * 국내·미국 주식은 밀어 넣는 워커가 아직 없어서 **언제나 이쪽에 걸린다**(FR-42).
 *
 * 2026-09-18 실측(표본 40 · 1초 간격 20회 × 크립토 2종목, 워커 가동 중):
 * p50 **2.5초** · p95 **4.8초** · 최대 **4.8초**. 임계값이 실측 최대의 **12.4배**라
 * 정상 운영에서는 걸리지 않고, 워커가 멈추면 1분 안에 화면에 드러난다.
 */
export const PRICE_STALE_AFTER_MS = 60_000;

const ageOf = (at: Date | null) => at?.getTime() ?? 0;

const toDate = (value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * 서버 응답 + 실시간 캐시 → 화면 계약.
 *
 * 서버 값이 기본이고 캐시는 **빈 자리를 채우거나 더 새로울 때만** 쓴다(FR-41).
 * 캐시에 없는 자산군(주식)은 서버 값을 그대로 쓰고 `priceStale` 로 표시한다(FR-42).
 */
export const toWatchlistViewModels = (
  serverItems: readonly ServerWatchlistItem[],
  priceCache: ReadonlyMap<string, CachedPrice>,
  now: Date,
): WatchlistItemVM[] =>
  serverItems.map((item) => {
    const serverAt = toDate(item.priceUpdatedAt);
    const live = priceCache.get(item.symbol.toUpperCase());

    const useLive =
      live !== undefined &&
      (item.currentPrice === null || ageOf(live.timestamp) > ageOf(serverAt));

    const currentPrice = useLive ? live.currentPrice : item.currentPrice;
    const changeRate = useLive ? live.change24h : item.priceChange24h;
    const priceAt = useLive ? live.timestamp : serverAt;

    return {
      id: item.id,
      assetType: item.assetType,
      symbol: item.symbol,
      name: item.name,
      currentPrice: currentPrice ?? null,
      changeRate: changeRate ?? null,
      priceStale:
        currentPrice === null ||
        priceAt === null ||
        now.getTime() - priceAt.getTime() > PRICE_STALE_AFTER_MS,
      logoUrl: item.logoUrl,
      priceUpdatedAt: priceAt ? priceAt.toISOString() : null,
    };
  });

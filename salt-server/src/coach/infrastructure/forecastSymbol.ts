/**
 * 코치 심볼 ↔ `forecast` 스키마 심볼(F011 슬라이스 5b).
 *
 * 코인은 업비트 마켓 코드(`BTC` → `KRW-BTC`), 국내 주식은 6자리 코드 그대로(`005930`). 코드 모양으로 자산군을
 * 추측하지 않는다 — 6글자 코인(`PUNDIX`)도 있다. 대신 두 키를 다 묻고, 걸린 행의 키로 자산군을 안다.
 * `forecast` 에 코인은 늘 접두가 붙어 있어 맨 심볼은 국내 주식뿐이다(salt-forecast `ingest/krx_daily.py`).
 */
export type ForecastAssetClass = "crypto" | "kr_stock";

const COIN_PREFIX = "KRW-";
/** 국내 주식 봉의 `open_time` 은 거래일 00:00 KST(= 전날 15:00 UTC). 코인 봉과 같은 "그날 00:00 UTC" 로 맞춘다 */
const KST_OFFSET_MS = 9 * 3_600_000;

export const forecastKeys = (symbol: string): string[] => [`${COIN_PREFIX}${symbol}`, symbol];

export const fromForecastKey = (key: string): { symbol: string; assetClass: ForecastAssetClass } =>
  key.startsWith(COIN_PREFIX)
    ? { symbol: key.slice(COIN_PREFIX.length), assetClass: "crypto" }
    : { symbol: key, assetClass: "kr_stock" };

/**
 * 일봉 시작 시각을 도메인 규칙(`DailyBar.openTime` = 그날 00:00 UTC = 09:00 KST)으로. 국내 주식은 +9시간 —
 * 거래일 날짜가 같아지고, 종가 확정 시각(`openTime + 1일`)은 실제(16:00 KST)보다 늦어 보수적이다.
 */
export const dailyOpenTime = (openTime: Date, assetClass: ForecastAssetClass): Date =>
  assetClass === "kr_stock" ? new Date(openTime.getTime() + KST_OFFSET_MS) : openTime;

/** 범위 시작을 국내 주식 보정만큼 앞당긴다 — SQL 은 보정 전 `open_time` 으로 거르므로 그날 봉이 빠지지 않게 */
export const widen = (from: Date): Date => new Date(from.getTime() - KST_OFFSET_MS);

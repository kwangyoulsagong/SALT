import {
  GAUGE_BUCKET_WIDTH,
  GAUGE_HORIZON_DAYS,
  GAUGE_LOOKBACK_DAYS,
  gaugeBucketCode,
  type Clock,
  type GaugeTrackStore,
  type MarketProbe,
} from "../domain";

const DAY_MS = 24 * 3600_000;

/**
 * 게이지 적중률을 다시 집계한다 (F004 · B9 · `SRV-REQ-024` FR-121). **일 1회** 워커가 부른다.
 *
 * 입력이 일봉 종가라 하루에 한 번보다 자주 돌려도 값이 거의 바뀌지 않는다.
 * 지금은 `sentiment` 만 쓴다 — `smart_money` 는 같은 계약의 Should(FR-124)다.
 */
export class RefreshGaugeTrackRecords {
  constructor(
    private readonly market: MarketProbe,
    private readonly gauges: GaugeTrackStore,
    private readonly now: Clock = () => new Date()
  ) {}

  async execute(): Promise<{ records: number }> {
    const computedAt = this.now();
    const distributions = await this.market.sentimentForwardReturns({
      bucketWidth: GAUGE_BUCKET_WIDTH,
      horizonDays: GAUGE_HORIZON_DAYS,
      since: new Date(computedAt.getTime() - GAUGE_LOOKBACK_DAYS * DAY_MS),
    });

    await this.gauges.replace(
      "sentiment",
      distributions.map((row) => ({
        symbol: row.symbol,
        bucketCode: gaugeBucketCode(row.bucketIndex),
        horizonDays: GAUGE_HORIZON_DAYS,
        sample: row.sample,
        p25: row.p25,
        median: row.median,
        p75: row.p75,
        positiveRate: row.positiveRate,
        windowFrom: row.windowFrom,
        windowTo: row.windowTo,
      })),
      computedAt
    );

    return { records: distributions.length };
  }
}

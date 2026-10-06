"""시장 · 거시 수집.

바이낸스(미결제약정 · 펀딩비 · 현물 일봉) · DefiLlama(스테이블코인) · ECB(원/달러 — 김치 프리미엄) ·
FRED(금리 · 환율 · 지수 · 물가) · Deribit DVOL(BTC · ETH 내재 변동성) · 업비트 거래 유의 · 주의 스냅샷(FC-REQ-014) ·
Coin Metrics BTC 온체인 · CoinGecko 도미넌스 스냅샷(FC-REQ-015).

미결제약정은 30일 이력뿐이라 **매일** 돈다. FRED 는 키가 없으면 건너뛰고 source_status 에 남긴다.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import UTC, date, datetime, timedelta

import httpx

from salt_forecast.config import settings
from salt_forecast.ingest import binance, coingecko, coinmetrics, defillama, deribit, ecb, fear_greed, fred
from salt_forecast.ingest.http import Pacer, SourceError
from salt_forecast.ingest.upbit import Pacer as UpbitPacer
from salt_forecast.ingest.upbit import UpbitDaily
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, symbols_arg
from salt_forecast.store.db import engine
from salt_forecast.store.market_warning import insert_snapshot
from salt_forecast.store.prices import Bar, latest_open, symbols, upsert_bars
from salt_forecast.store.runs import mark_source
from salt_forecast.store.series import SeriesPoint, latest_observed, upsert_points

JOB = "ingest_market"
SOURCES = ("binance", "defillama", "ecb", "fred", "fear_greed", "deribit", "upbit_warning", "coinmetrics", "coingecko")
HISTORY_START = date(2022, 9, 1)


def main(argv: list[str] | None = None) -> int:
    p = base_parser("시장 · 거시 수집")
    p.add_argument("--only", choices=SOURCES, action="append", help="이 소스만(반복 가능)")
    p.add_argument("--since", default=None, help="바이낸스 현물 · 펀딩비를 이 날부터 다시 받는다(백필). 없으면 증분")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        cfg = settings()
        eng = engine()
        now = parse_as_of(args.as_of)
        only = set(args.only or SOURCES)
        total = 0

        def save_points(points: Iterable[SeriesPoint]) -> int:
            pts = list(points)
            return len(pts) if args.dry_run else upsert_points(eng, pts)

        def save_bars(bars: Iterable[Bar]) -> int:
            bs = list(bars)
            return len(bs) if args.dry_run else upsert_bars(eng, bs)

        def save_spot(days: Iterable[binance.SpotDay]) -> int:
            ds = list(days)
            return save_bars(d.bar for d in ds) + save_points(d.taker_buy_ratio for d in ds if d.taker_buy_ratio)

        def guarded(source: str, label: str, fn: Callable[[], int]) -> int:
            try:
                return fn()
            except SourceError as e:
                failed.setdefault(source, []).append(label)
                log.warning(
                    "수집 실패", extra={"fields": {"job": JOB, "source": source, "item": label, "error": str(e)}}
                )
                return 0

        failed: dict[str, list[str]] = {}
        with httpx.Client(headers={"Accept": "application/json"}) as client:
            if "binance" in only:
                api = binance.Binance(
                    client, cfg.binance_futures_url, cfg.binance_spot_url, Pacer(cfg.binance_requests_per_second)
                )
                upbit_bases = {s.removeprefix("KRW-") for s in symbols(eng, "upbit", "1d")}
                wanted = symbols_arg(args.symbols)
                bases = sorted((upbit_bases & api.perpetual_bases()) if wanted is None else set(wanted))
                funding_last = latest_observed(eng, binance.SOURCE)
                spot_last = latest_open(eng, binance.SOURCE, "1d")
                start = now.replace(year=HISTORY_START.year, month=HISTORY_START.month, day=HISTORY_START.day)
                spot_start = parse_as_of(args.since) if args.since else start
                for b in bases:
                    total += guarded("binance", f"oi:{b}", lambda b=b: save_points(api.open_interest(b, now)))
                    f_since = spot_start if args.since else funding_last.get(f"funding:{b}", start)
                    total += guarded(
                        "binance", f"funding:{b}", lambda b=b, s=f_since: save_points(api.funding(b, s, now))
                    )
                    s_since = (
                        spot_start
                        if args.since
                        else spot_last.get(f"{b}USDT", start - timedelta(days=1)) + timedelta(days=1)
                    )
                    total += guarded(
                        "binance", f"spot:{b}", lambda b=b, s=s_since: save_spot(api.spot_daily(b, s, now))
                    )
                log.info("binance", extra={"fields": {"job": JOB, "bases": len(bases)}})
            if "defillama" in only:
                total += guarded(
                    "defillama",
                    defillama.SERIES,
                    lambda: save_points(
                        defillama.stablecoin_total(client, cfg.defillama_stablecoins_url, Pacer(2.0), now)
                    ),
                )
            if "fear_greed" in only:
                total += guarded(
                    "fear_greed",
                    fear_greed.SERIES,
                    lambda: save_points(fear_greed.history(client, cfg.fear_greed_url, Pacer(1.0), now)),
                )
            if "deribit" in only:
                d_last = latest_observed(eng, deribit.SOURCE)
                d_pacer = Pacer(cfg.deribit_requests_per_second)
                for cur in deribit.CURRENCIES:
                    last = d_last.get(deribit.series_id(cur))
                    # 증분은 마지막 관측 1주 전부터 다시(늦게 닫힌 봉 · 원천 보정) — 같은 키는 덮어도 값이 같다
                    d_since = deribit.HISTORY_START if last is None else last - timedelta(days=7)
                    total += guarded(
                        "deribit",
                        deribit.series_id(cur),
                        lambda cur=cur, s=d_since: save_points(
                            deribit.dvol(client, cfg.deribit_url, d_pacer, cur, s, now)
                        ),
                    )
            if "upbit_warning" in only:
                upbit = UpbitDaily(client, cfg.upbit_base_url, UpbitPacer(cfg.upbit_requests_per_second))

                def save_warnings() -> int:
                    # 지금 상태만 주는 원천 — --as-of 와 무관하게 실제로 받은 시각을 쓴다(과거 시각으로 적지 않는다)
                    rows = upbit.market_warnings(datetime.now(UTC))
                    return len(rows) if args.dry_run else insert_snapshot(eng, rows)

                total += guarded("upbit_warning", "market_event", save_warnings)
            if "coinmetrics" in only:
                # 증분은 마지막 관측 다음 날부터만 — 고쳐진 값으로 과거를 덮지 않는다(ingest/coinmetrics.py)
                cm_last = latest_observed(eng, coinmetrics.SOURCE)
                total += guarded(
                    "coinmetrics",
                    coinmetrics.ASSET,
                    lambda: save_points(
                        coinmetrics.daily(
                            client, cfg.coinmetrics_url, Pacer(cfg.coinmetrics_requests_per_second), cm_last, now
                        )
                    ),
                )
            if "coingecko" in only:
                # 지금 값만 주는 원천 — --as-of 와 무관하게 실제로 받은 시각을 쓴다
                total += guarded(
                    "coingecko",
                    "global",
                    lambda: save_points(
                        coingecko.global_snapshot(client, cfg.coingecko_url, Pacer(1.0), datetime.now(UTC))
                    ),
                )
            if "ecb" in only:
                last = latest_observed(eng, ecb.SOURCE).get(ecb.SERIES)
                ecb_since = HISTORY_START - timedelta(days=10) if last is None else last.date() - timedelta(days=7)
                total += guarded(
                    "ecb",
                    ecb.SERIES,
                    lambda: save_points(ecb.usd_krw(client, cfg.ecb_rates_url, Pacer(1.0), ecb_since, now)),
                )
            if "fred" in only:
                if cfg.fred_api_key is None:
                    failed["fred"] = ["FORECAST_FRED_API_KEY 없음"]
                    log.warning("FRED 키 없음 — 건너뜀", extra={"fields": {"job": JOB}})
                else:
                    key = cfg.fred_api_key.get_secret_value()
                    pacer = Pacer(1.5)  # 분당 120 의 80% 보다 여유
                    for sid in fred.SERIES:
                        total += guarded(
                            "fred",
                            sid,
                            lambda sid=sid: save_points(
                                fred.observations(client, cfg.fred_url, key, pacer, sid, HISTORY_START, now)
                            ),
                        )
        if not args.dry_run:
            for source in only:
                errs = failed.get(source)
                mark_source(eng, source, ok=not errs, error=", ".join(errs[:10]) if errs else None)
        log.info("수집", extra={"fields": {"job": JOB, "failed": {k: v[:10] for k, v in failed.items()}}})
        return total

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

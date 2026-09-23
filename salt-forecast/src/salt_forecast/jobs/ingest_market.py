"""시장 · 거시 수집.

바이낸스(미결제약정 · 펀딩비 · 현물 일봉) · DefiLlama(스테이블코인) · FRED(금리 · 환율 · 지수 · 물가).

미결제약정은 30일 이력뿐이라 **매일** 돈다. FRED 는 키가 없으면 건너뛰고 source_status 에 남긴다.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import date, timedelta

import httpx

from salt_forecast.config import settings
from salt_forecast.ingest import binance, defillama, fred
from salt_forecast.ingest.http import Pacer, SourceError
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, symbols_arg
from salt_forecast.store.db import engine
from salt_forecast.store.prices import Bar, latest_open, symbols, upsert_bars
from salt_forecast.store.runs import mark_source
from salt_forecast.store.series import SeriesPoint, latest_observed, upsert_points

JOB = "ingest_market"
SOURCES = ("binance", "defillama", "fred")
HISTORY_START = date(2022, 9, 1)


def main(argv: list[str] | None = None) -> int:
    p = base_parser("시장 · 거시 수집")
    p.add_argument("--only", choices=SOURCES, action="append", help="이 소스만(반복 가능)")
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
                for b in bases:
                    total += guarded("binance", f"oi:{b}", lambda b=b: save_points(api.open_interest(b, now)))
                    f_since = funding_last.get(f"funding:{b}", start)
                    total += guarded(
                        "binance", f"funding:{b}", lambda b=b, s=f_since: save_points(api.funding(b, s, now))
                    )
                    s_since = spot_last.get(f"{b}USDT", start - timedelta(days=1)) + timedelta(days=1)
                    total += guarded(
                        "binance", f"spot:{b}", lambda b=b, s=s_since: save_bars(api.spot_daily(b, s, now))
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

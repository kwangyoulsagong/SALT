"""업비트 일봉 수집. 기본은 증분(최근 --days 일), --since 를 주면 백필(종목별 이미 있는 가장 이른 봉부터 이어서)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import httpx

from salt_forecast.config import settings
from salt_forecast.ingest.upbit import INTERVAL, SOURCE, Pacer, SourceError, UpbitDaily
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, symbols_arg
from salt_forecast.store.db import engine
from salt_forecast.store.prices import Bar, earliest_open, upsert_bars
from salt_forecast.store.runs import mark_source

JOB = "ingest_prices"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("업비트 일봉 수집")
    p.add_argument("--since", default=None, help="백필 시작(ISO). 없으면 증분")
    p.add_argument("--days", type=int, default=7, help="증분 범위(일)")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        cfg = settings()
        eng = engine()
        now = parse_as_of(args.as_of)
        with httpx.Client(headers={"Accept": "application/json"}) as client:
            api = UpbitDaily(client, cfg.upbit_base_url, Pacer(cfg.upbit_requests_per_second))
            symbols = symbols_arg(args.symbols) or api.krw_markets()
            earliest = earliest_open(eng, SOURCE, INTERVAL) if args.since else {}
            total = 0
            failed: list[str] = []
            t0 = datetime.now(UTC)
            for i, sym in enumerate(symbols, 1):
                if i % 25 == 0:
                    sec = (datetime.now(UTC) - t0).total_seconds()
                    log.info("진행", extra={"fields": {"job": JOB, "done": i, "of": len(symbols), "sec": round(sec)}})
                if args.since:
                    since = parse_as_of(args.since)
                    until = earliest.get(sym, now)  # 이미 있는 봉 이전만
                    ranges = [(since, until), (now - timedelta(days=args.days), now)]
                else:
                    ranges = [(now - timedelta(days=args.days), now)]
                try:
                    bars: list[Bar] = [b for s, u in ranges if u > s for b in api.fetch(sym, s, u, now)]
                except SourceError as e:
                    failed.append(sym)
                    log.warning("종목 수집 실패", extra={"fields": {"job": JOB, "symbol": sym, "error": str(e)}})
                    continue
                if not args.dry_run:
                    total += upsert_bars(eng, bars)
                else:
                    total += len(bars)
            if not args.dry_run:
                mark_source(
                    eng,
                    SOURCE,
                    ok=not failed or len(failed) < len(symbols),
                    error=f"{len(failed)}종목 실패" if failed else None,
                )
            log.info(
                "수집",
                extra={"fields": {"job": JOB, "symbols": len(symbols), "failed": failed[:20], "at": datetime.now(UTC)}},
            )
            return total

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

"""업비트 일봉 · 1시간봉 · 5분봉 수집. 기본은 증분(최근 --days 일),
--since 를 주면 백필(종목별 이미 있는 가장 이른 봉부터 이어서).

`--interval 1h` 는 단타 방향 확률(`short-direction@1`)의 재료 — 매시 증분, 백필은 한 번.
`--interval 5m` 은 장중 기저율(`base-rate@3`)의 재료 — 작업 이름(락)이 따로다(`ingest_prices_5m`). 2년 백필이 10시간쯤
걸리는데 같은 락이면 그동안 매시 1시간봉 증분이 "이미 실행 중"으로 건너뛰어 단타 예측이 묵은 봉을 본다.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import httpx

from salt_forecast.config import settings
from salt_forecast.ingest.upbit import FIVE, HOUR, INTERVAL, SOURCE, Pacer, SourceError, UpbitDaily
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, symbols_arg
from salt_forecast.store.db import engine
from salt_forecast.store.prices import Bar, earliest_open, upsert_bars
from salt_forecast.store.runs import mark_source

JOB = "ingest_prices"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("업비트 일봉 수집")
    p.add_argument("--since", default=None, help="백필 시작(ISO). 없으면 증분")
    p.add_argument("--days", type=float, default=7, help="증분 범위(일)")
    p.add_argument("--interval", choices=(INTERVAL, HOUR, FIVE), default=INTERVAL, help="봉 길이")
    args = p.parse_args(argv)
    job = f"{JOB}_5m" if args.interval == FIVE else JOB
    log = logger(job)

    def body() -> int:
        cfg = settings()
        eng = engine()
        now = parse_as_of(args.as_of)
        with httpx.Client(headers={"Accept": "application/json"}) as client:
            api = UpbitDaily(client, cfg.upbit_base_url, Pacer(cfg.upbit_requests_per_second))
            symbols = symbols_arg(args.symbols) or api.krw_markets()
            earliest = earliest_open(eng, SOURCE, args.interval) if args.since else {}
            # 상장일 = 일봉의 첫 봉. 상장이 since 보다 늦은 종목은 상장일부터만 — 다 찬 종목에 요청을 보내지 않아
            # 매시 도는 빈 곳 메우기(ops/backfill.sh)가 다 찬 뒤엔 요청 0건으로 끝난다
            listed = earliest_open(eng, SOURCE, INTERVAL) if args.since and args.interval != INTERVAL else {}
            total = 0
            failed: list[str] = []
            t0 = datetime.now(UTC)
            for i, sym in enumerate(symbols, 1):
                if i % 25 == 0:
                    sec = (datetime.now(UTC) - t0).total_seconds()
                    log.info("진행", extra={"fields": {"job": job, "done": i, "of": len(symbols), "sec": round(sec)}})
                if args.since:
                    since = parse_as_of(args.since)
                    until = earliest.get(sym, now)  # 이미 있는 봉 이전만
                    start = backfill_start(since, listed.get(sym), until)
                    ranges = [(start, until), (now - timedelta(days=args.days), now)]
                else:
                    ranges = [(now - timedelta(days=args.days), now)]
                try:
                    bars: list[Bar] = [b for s, u in ranges if u > s for b in api.fetch(sym, s, u, now, args.interval)]
                except SourceError as e:
                    failed.append(sym)
                    log.warning("종목 수집 실패", extra={"fields": {"job": job, "symbol": sym, "error": str(e)}})
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
                extra={"fields": {"job": job, "symbols": len(symbols), "failed": failed[:20], "at": datetime.now(UTC)}},
            )
            return total

    return run_job(job, args, body)


def backfill_start(since: datetime, listed: datetime | None, earliest: datetime) -> datetime:
    """백필 구간 시작. 이미 상장 첫날(일봉 첫 봉 + 하루 여유)까지 차 있으면 earliest 를 돌려 구간을 비운다.

    하루 여유 — 일봉은 00:00 UTC 에 열리고 상장 첫 분봉은 그날 중간에 열린다.
    """
    start = since if listed is None else max(since, listed)
    return earliest if earliest <= start + timedelta(days=1) else start


if __name__ == "__main__":
    raise SystemExit(main())

"""대형 체결 이력 백필 — 바이낸스 aggTrades 일 덤프 → series_point(binance_vision, whale_*) (FC-REQ-008 FR-3).

대상은 업비트 원화 거래대금 상위 N 중 바이낸스 USDT 현물이 있는 종목. 날짜를 **최신부터 거꾸로** 돈다 — 중간에
끊겨도 최근 구간의 종목 단면이 온전히 남는다(IC 는 날짜별 단면이다). 이미 있는 (종목, 날)은 건너뛴다(재시작 가능).
기본 범위는 1년(사용자 결정 2026-09-27 — 4년치는 수백 GB).
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta

import httpx

from salt_forecast.config import settings
from salt_forecast.ingest import binance_dumps
from salt_forecast.ingest.http import SourceError
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, symbols_arg
from salt_forecast.store.db import engine
from salt_forecast.store.prices import symbols as bar_symbols
from salt_forecast.store.prices import top_by_value
from salt_forecast.store.runs import mark_source
from salt_forecast.store.series import SeriesPoint, observed_days, upsert_points

JOB = "backfill_whale"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("대형 체결 이력 백필(바이낸스 aggTrades 덤프)")
    p.add_argument("--since", default=None, help="시작일(ISO). 기본 as_of − 365일")
    p.add_argument("--until", default=None, help="끝일(ISO, 포함). 기본 as_of 전날")
    p.add_argument("--top", type=int, default=30, help="업비트 거래대금 상위 N")
    p.add_argument("--workers", type=int, default=6, help="동시 다운로드 수")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        cfg = settings()
        eng = engine()
        now = parse_as_of(args.as_of)
        until = parse_as_of(args.until).date() if args.until else (now - timedelta(days=1)).date()
        since = parse_as_of(args.since).date() if args.since else until - timedelta(days=364)
        binance_pairs = set(bar_symbols(eng, "binance", "1d"))
        wanted = symbols_arg(args.symbols)
        bases = (
            wanted
            or [
                s.removeprefix("KRW-")
                for s in top_by_value(eng, "upbit", "1d", now, 30, args.top * 3)
                if f"{s.removeprefix('KRW-')}USDT" in binance_pairs
            ][: args.top]
        )
        done = {(sid.split(":", 1)[1], at.date()) for sid, at in observed_days(eng, binance_dumps.SOURCE, "whale_n:")}
        days = [until - timedelta(days=i) for i in range((until - since).days + 1)]
        log.info("대상", extra={"fields": {"job": JOB, "bases": bases, "days": len(days), "done": len(done)}})

        total = 0
        failed: list[str] = []
        with (
            httpx.Client(headers={"User-Agent": "salt-forecast"}) as client,
            ThreadPoolExecutor(max_workers=args.workers) as pool,
        ):

            def one(base: str, day: date) -> list[SeriesPoint] | None:
                try:
                    flow = binance_dumps.daily_flow(client, cfg.binance_dump_url, f"{base}USDT", day)
                except SourceError as e:
                    failed.append(f"{base}:{day}")
                    log.warning("실패", extra={"fields": {"job": JOB, "symbol": base, "day": day, "error": str(e)}})
                    return None
                return None if flow is None else binance_dumps.points(base, day, flow)

            for i, day in enumerate(days, 1):
                todo = [b for b in bases if (b, day) not in done]
                results = list(pool.map(one, todo, [day] * len(todo)))
                pts = [pt for r in results if r for pt in r]
                total += len(pts) if args.dry_run else upsert_points(eng, pts)
                if i % 10 == 0 or i == len(days):
                    log.info(
                        "진행",
                        extra={"fields": {"job": JOB, "day": day, "done": i, "of": len(days), "rows": total}},
                    )
        if not args.dry_run:
            mark_source(eng, binance_dumps.SOURCE, ok=not failed, error=f"{len(failed)}건 실패" if failed else None)
        log.info("수집", extra={"fields": {"job": JOB, "failed": failed[:20], "at": datetime.now(UTC)}})
        return total

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

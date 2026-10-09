"""국내 주식 일봉 옮기기 — `public.price_history`(서버 · KIS) → `forecast.price_bar` source=kis(FC-REQ-009).

매번 전부 다시 읽는다(약 2.5만 행, 2년 × 유니버스 50). 증분으로 자르면 유니버스에 새로 들어온 종목의 2년 백필과
서버가 15:45 에 덮어쓴 장중 미확정 봉을 놓친다. 같은 키는 upsert 라 행 수가 늘지 않는다.
"""

from __future__ import annotations

from salt_forecast.ingest import krx_daily
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.store.db import engine
from salt_forecast.store.kr_stock import kr_daily_rows
from salt_forecast.store.prices import upsert_bars
from salt_forecast.store.runs import mark_source

JOB = "ingest_kr_stock"


def main(argv: list[str] | None = None) -> int:
    args = base_parser("국내 주식 일봉 옮기기").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        now = parse_as_of(args.as_of)
        rows = kr_daily_rows(eng)
        bars = list(krx_daily.to_bars(rows, now))
        fields = {"job": JOB, "rows": len(rows), "bars": len(bars), "codes": len({b.symbol for b in bars})}
        log.info("국내 주식 일봉", extra={"fields": fields})
        if args.dry_run:
            return len(bars)
        n = upsert_bars(eng, bars)
        # 0건이면 서버 KIS 가 꺼졌거나(키 없음) 아직 백필 전이다 — 조용히 성공으로 남기지 않는다
        mark_source(eng, krx_daily.SOURCE, ok=bool(bars), error=None if bars else "국내 주식 일봉 0건")
        return n

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

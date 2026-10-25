"""국내 주식 일봉 옮기기 — `public.price_history`(서버 · KIS) → `forecast.price_bar` source=kis(FC-REQ-009).

매번 전부 다시 읽는다(약 286만 행, 5년 × 전 종목 2,605 — 2026-10-11 실측 81초). 증분으로 자르면 새 종목 백필과
서버가 15:45 에 덮어쓴 장중 미확정 봉 · **수정주가 재작성으로 통째로 바뀐 이력**(SRV-REQ-040 FR-42)을 놓친다. 같은 키는
upsert 라 행 수가 늘지 않는다. 서버 이력이 앞쪽에서 짧아졌으면 그 앞 봉을 지운다(FC-REQ-020 FR-10) — 옛 기준 봉과
새 기준 봉이 한 시계열에 섞이면 가짜 급등락이 수익률 · 척도 · 채점에 들어간다.
"""

from __future__ import annotations

from salt_forecast.ingest import krx_daily
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.store.db import engine
from salt_forecast.store.kr_stock import kr_daily_rows
from salt_forecast.store.prices import delete_bars_before, upsert_bars
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
        first_open = krx_daily.first_open(bars)
        fields = {"job": JOB, "rows": len(rows), "bars": len(bars), "codes": len(first_open)}
        log.info("국내 주식 일봉", extra={"fields": fields})
        if args.dry_run:
            return len(bars)
        n = upsert_bars(eng, bars)
        pruned = delete_bars_before(eng, krx_daily.SOURCE, krx_daily.INTERVAL, first_open)
        log.info("국내 주식 일봉 앞쪽 정리", extra={"fields": {"job": JOB, "deleted": pruned}})
        # 0건이면 서버 KIS 가 꺼졌거나(키 없음) 아직 백필 전이다 — 조용히 성공으로 남기지 않는다
        mark_source(eng, krx_daily.SOURCE, ok=bool(bars), error=None if bars else "국내 주식 일봉 0건")
        return n

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

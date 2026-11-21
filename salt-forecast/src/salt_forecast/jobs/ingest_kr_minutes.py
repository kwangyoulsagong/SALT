"""국내 주식 5분봉 쌓기 — 서버 5분봉 → forecast.price_bar kis 5m(FC-REQ-028 FR-7 · 사전등록 base-rate@3).

5분마다(intraday.sh). 기본은 최근 3일을 겹쳐 다시 옮긴다 —
서버가 15:40 · 20:40 에 그날 봉을 덮어쓰고, 밤 백필이 지난 날을 채운다.
밤 백필 뒤 처음은 `--days 400`(서버가 가진 전부). 지우지 않는다 — 단 장 시간이 평상일과 다른 날
(수능일 · 새해 첫 개장일)은 그날 장 밖 봉(동시호가 예상가)을 걷는다(2026-11-21, `calendar.krx_shifted_days`).
"""

from __future__ import annotations

from datetime import timedelta

from salt_forecast.domain.calendar import krx_shifted_days
from salt_forecast.ingest import krx_minutes
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.store.db import engine
from salt_forecast.store.kr_stock import kr_minute_rows, krx_closed_dates
from salt_forecast.store.prices import delete_bars_outside_hours, upsert_bars
from salt_forecast.store.runs import mark_source

JOB = "ingest_kr_minutes"
KST = timedelta(hours=9)


def main(argv: list[str] | None = None) -> int:
    p = base_parser("국내 주식 5분봉 쌓기")
    p.add_argument("--days", type=float, default=3.0, help="다시 옮길 범위(일). 서버 밤 백필 뒤엔 400")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        now = parse_as_of(args.as_of)
        since = now - timedelta(days=args.days)
        rows = kr_minute_rows(eng, since)
        closed = set(krx_closed_dates(eng))
        bars = list(krx_minutes.to_bars(rows, now, closed))
        codes = {b.symbol for b in bars}
        shifted = krx_shifted_days((since + KST).date(), (now + KST).date(), closed)
        fields = {"job": JOB, "rows": len(rows), "bars": len(bars), "codes": len(codes), "shifted_days": len(shifted)}
        log.info("국내 주식 5분봉", extra={"fields": fields})
        if args.dry_run:
            return len(bars)
        n = upsert_bars(eng, bars)
        pruned = delete_bars_outside_hours(eng, krx_minutes.SOURCE, krx_minutes.INTERVAL, codes, shifted)
        if pruned:
            days = [str(d) for d, _, _ in shifted]
            log.info("국내 주식 5분봉 장 밖 정리", extra={"fields": {"job": JOB, "deleted": pruned, "days": days}})
        # 장 밖 · 휴장에는 새 봉이 없는 게 정상이다 — 0건을 실패로 적지 않는다(신선도는 ops 쿼리가 본다)
        mark_source(eng, "kis_minutes", ok=True, error=None)
        return n

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

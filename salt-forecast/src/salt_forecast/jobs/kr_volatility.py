"""국내 주식 실현 변동성 — `kis` 일봉 → EWMA · GARCH 도전자 → forecast.realized_vol (FC-REQ-009 FR-9).

코인 `volatility` 와 같은 계산 · 같은 채점 · 같은 표. 다른 것은 연율(252 거래일)과 시세 끊김 판정(거래일 달력,
2 영업일). BTC 베타는 없다(NULL). as_of 는 코인과 같이 UTC 자정 — 휴장일에 돌아도 직전 거래일 종가까지만 본다.
"""

from __future__ import annotations

from datetime import UTC, datetime

from salt_forecast.domain.volatility import KR_ANNUAL_DAYS, estimate
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs._data import load_kr
from salt_forecast.store.db import engine
from salt_forecast.store.volatility import upsert_realized_vol

JOB = "kr_volatility"


def main(argv: list[str] | None = None) -> int:
    args = base_parser("국내 주식 실현 변동성").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        now = parse_as_of(args.as_of)
        as_of = datetime(now.year, now.month, now.day, tzinfo=UTC)
        series, cal = load_kr(eng, now)
        estimates = [estimate(s, as_of, KR_ANNUAL_DAYS, lambda c, t: cal.fresh(c, t, slack=1)) for s in series.values()]
        blocked: dict[str, int] = {}
        for e in estimates:
            if e.blocked_reason:
                blocked[e.blocked_reason] = blocked.get(e.blocked_reason, 0) + 1
        ok = [e for e in estimates if e.annualized is not None]
        fields = {
            "job": JOB,
            "as_of": as_of.isoformat(),
            "symbols": len(estimates),
            "renderable": len(ok),
            "blocked": blocked,
            "sample": {e.symbol: round(e.annualized or 0, 3) for e in ok[:5]},
        }
        log.info("국내 주식 실현 변동성", extra={"fields": fields})
        return len(estimates) if args.dry_run else upsert_realized_vol(eng, estimates, now)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

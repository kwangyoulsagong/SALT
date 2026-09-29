"""실현 변동성 — 업비트 일봉 → EWMA · GARCH(1,1) · BTC 베타 → forecast.realized_vol (FC-REQ-006 · 009).

as_of 는 UTC 자정으로 내린다 — 일봉이 00:00 UTC 에 닫히므로 하루 안의 어느 시각에 돌려도 같은 값이다(멱등).
대상은 일봉이 있는 종목 전부다. 사이즈 계산은 사용자가 고른 아무 종목이나 묻는다(FEATURE-009 FR-5).
"""

from __future__ import annotations

from datetime import UTC, datetime

from salt_forecast.domain.regime import beta_by_symbol
from salt_forecast.domain.volatility import estimate
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, symbols_arg
from salt_forecast.store.db import engine
from salt_forecast.store.prices import load_close_series
from salt_forecast.store.volatility import upsert_realized_vol

JOB = "volatility"
BTC = "KRW-BTC"


def main(argv: list[str] | None = None) -> int:
    args = base_parser("실현 변동성").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        now = parse_as_of(args.as_of)
        as_of = datetime(now.year, now.month, now.day, tzinfo=UTC)
        series = load_close_series(eng, "upbit", "1d", symbols_arg(args.symbols))
        estimates = [estimate(s, as_of) for s in series.values()]
        # BTC 베타는 대상과 무관하게 BTC 일봉이 있어야 한다 — --symbols 로 좁혀도 BTC 를 따로 읽는다
        btc = series.get(BTC) or load_close_series(eng, "upbit", "1d", [BTC]).get(BTC)
        betas = beta_by_symbol({**series, **({BTC: btc} if btc else {})}, BTC, int(as_of.timestamp()))
        ok = [e for e in estimates if e.annualized is not None]
        blocked: dict[str, int] = {}
        for e in estimates:
            if e.blocked_reason:
                blocked[e.blocked_reason] = blocked.get(e.blocked_reason, 0) + 1
        garch_wins = sum(1 for e in ok if e.qlike_garch is not None and e.qlike_ewma and e.qlike_garch < e.qlike_ewma)
        log.info(
            "실현 변동성",
            extra={
                "fields": {
                    "job": JOB,
                    "as_of": as_of.isoformat(),
                    "symbols": len(estimates),
                    "renderable": len(ok),
                    "blocked": blocked,
                    "garch_beats_ewma": garch_wins,
                    "sample": {e.symbol: round(e.annualized or 0, 3) for e in ok[:5]},
                    "btc_beta": sum(1 for v in betas.values() if v is not None),
                }
            },
        )
        return len(estimates) if args.dry_run else upsert_realized_vol(eng, estimates, now, betas)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

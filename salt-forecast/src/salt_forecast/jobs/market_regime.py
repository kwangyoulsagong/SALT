"""시장 국면 — BTC 일봉 → 200일선 · 2상태 HMM · 낙폭 · 채택 게이트 · 다음 이벤트 → forecast.market_regime (FC-REQ-009).

as_of 는 UTC 자정으로 내린다(일봉이 00:00 UTC 에 닫힌다 — 하루 안 어느 시각에 돌려도 같은 값, 멱등).
게이트 · 이벤트 축소 계수는 사전등록 regime-gate@1 판정이 정한 **코드 상수**(`domain/regime.py`)다.
"""

from __future__ import annotations

from datetime import UTC, datetime

from salt_forecast.domain.regime import regime_state
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.store.db import engine
from salt_forecast.store.events import events_known
from salt_forecast.store.prices import load_close_series
from salt_forecast.store.regime import upsert_market_regime

JOB = "market_regime"
BTC = "KRW-BTC"


def main(argv: list[str] | None = None) -> int:
    args = base_parser("시장 국면").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        now = parse_as_of(args.as_of)
        as_of = datetime(now.year, now.month, now.day, tzinfo=UTC)
        btc = load_close_series(eng, "upbit", "1d", [BTC]).get(BTC)
        if btc is None:
            raise RuntimeError("KRW-BTC 일봉이 없다")
        events = [(e.kind, int(e.event_at.timestamp())) for e in events_known(eng, as_of)]
        state = regime_state(btc, int(as_of.timestamp()), events)
        if state is None:
            raise RuntimeError("as_of 까지 BTC 일봉이 없다")
        log.info(
            "국면",
            extra={"fields": {"job": JOB, "as_of": as_of.isoformat(), "trend_open": state.trend_open,
                              "hmm_p_high": state.hmm_p_high, "gate_key": state.gate_key,
                              "gate_open": state.gate_open, "drawdown": state.drawdown_365d,
                              "next_event": state.next_event_kind}},
        )  # fmt: skip
        return 1 if args.dry_run else upsert_market_regime(eng, [state], now)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

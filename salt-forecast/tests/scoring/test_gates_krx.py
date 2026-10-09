"""국내 주식 게이트 표본 = 주 첫 거래일 as_of(FC-REQ-009). 월요일 휴장 주의 화요일도 센다."""

from __future__ import annotations

from datetime import UTC, date, datetime

from salt_forecast.domain.calendar import KrxSessions, krx_session, on_weekly_grid
from salt_forecast.domain.quantiles import Z_SCORES, QuantileForecast
from salt_forecast.domain.scoring import score
from salt_forecast.scoring.evaluate import gates, weekly_only
from salt_forecast.store.predictions import ScoreRow

CAL = KrxSessions.from_dates([date(2026, 9, 28), date(2026, 9, 29), date(2026, 10, 6), date(2026, 10, 7)])
FC = QuantileForecast.from_array(Z_SCORES * 0.1, 0.5)


def _row(d: date, model: str = "kr-ens-baseline@0.1.0") -> ScoreRow:
    at = datetime.fromtimestamp(krx_session(d), tz=UTC)
    return ScoreRow("005930", 1, at, model, "backtest", score(FC, "abstain", 0.01))


def test_tuesday_after_monday_holiday_counts() -> None:
    rows = [_row(d) for d in (date(2026, 9, 28), date(2026, 9, 29), date(2026, 10, 6), date(2026, 10, 7))]
    kept = weekly_only(rows, CAL.on_grid)
    assert [r.as_of.date() for r in kept] == [date(2026, 9, 28), date(2026, 10, 6)]
    # 코인 격자(월요일)로 세면 10-06(화) 주를 통째로 잃는다 — 자산군마다 격자를 넘겨야 하는 이유
    assert [r.as_of.date() for r in weekly_only(rows, on_weekly_grid)] == [date(2026, 9, 28)]


def test_gate_uses_given_grid() -> None:
    rows = [
        _row(d, m) for d in (date(2026, 9, 28), date(2026, 10, 6)) for m in ("kr-ens-baseline@0.1.0", "kr-rw@0.1.0")
    ]
    (g,) = gates(rows, "kr-ens-baseline@0.1.0", "kr-rw@0.1.0", set(), [("005930", 1)], CAL.on_grid)
    assert g.result.sample == 2

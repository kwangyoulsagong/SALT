"""게이트 표본은 주 격자 as_of 로 센다 — 매일 나오는 live 행 120개는 52주가 아니다(F010 슬라이스 0)."""

from __future__ import annotations

from datetime import UTC, datetime

from salt_forecast.domain.calendar import on_weekly_grid, weekly_grid
from salt_forecast.domain.quantiles import Z_SCORES, QuantileForecast
from salt_forecast.domain.scoring import score
from salt_forecast.domain.series import DAY, WEEK
from salt_forecast.scoring.evaluate import LIVE_SAMPLE_FOR_LIVE_GATE, gates, weekly_only
from salt_forecast.store.predictions import GateRow, Kind, ScoreRow

MONDAY = 1_767_571_200  # 2026-01-05 00:00 UTC (월)
MODEL, BASE = "ens@0.1.0+abc", "rw@0.1.0+abc"
FC_MODEL = QuantileForecast.from_array(Z_SCORES * 0.10, 0.5)
FC_BASE = QuantileForecast.from_array(Z_SCORES * 0.12, 0.5)


def _rows(as_ofs: list[int], kind: Kind) -> list[ScoreRow]:
    out: list[ScoreRow] = []
    for i, t in enumerate(as_ofs):
        realized = 0.01 if i % 2 else -0.01
        at = datetime.fromtimestamp(t, tz=UTC)
        out.append(ScoreRow("KRW-BTC", 4, at, MODEL, kind, score(FC_MODEL, "abstain", realized)))
        out.append(ScoreRow("KRW-BTC", 4, at, BASE, kind, score(FC_BASE, "abstain", realized)))
    return out


def _gate(rows: list[ScoreRow]) -> GateRow:
    (g,) = gates(rows, MODEL, BASE, set(), [("KRW-BTC", 4)])
    return g


def test_daily_live_rows_do_not_count_as_weeks() -> None:
    """매일 120행 = 주 격자 17~18개 < 52 → 백테스트 점수로 판정한다."""
    daily = [MONDAY + i * DAY for i in range(120)]
    backtest = weekly_grid(MONDAY - 80 * WEEK, MONDAY - WEEK)
    g = _gate(_rows(daily, "live") + _rows(backtest, "backtest"))
    assert g.score_kind == "backtest"
    assert g.result.sample == min(len(backtest), 52)


def test_weekly_live_rows_reach_live_gate() -> None:
    weekly = weekly_grid(MONDAY, MONDAY + 59 * WEEK)
    assert len(weekly) == 60 >= LIVE_SAMPLE_FOR_LIVE_GATE
    g = _gate(_rows(weekly, "live"))
    assert g.score_kind == "live"
    assert g.result.sample == 52  # GATE_WINDOW 만큼만 본다


def test_mixed_daily_and_weekly_counts_only_mondays() -> None:
    """월요일 행과 평일 행이 섞여 있으면 월요일만 센다 — 표본 수가 격자 수와 같다."""
    weekly = weekly_grid(MONDAY, MONDAY + 55 * WEEK)  # 56개 월요일
    weekdays = [t + d * DAY for t in weekly for d in (1, 2, 3, 4, 5, 6)]
    g = _gate(_rows(weekly + weekdays, "live"))
    assert g.score_kind == "live"
    assert g.result.sample == 52
    only_weekly = _gate(_rows(weekly, "live"))
    assert g.result == only_weekly.result  # 평일 행은 판정에 영향이 없다

    few = weekly[:30]
    g2 = _gate(_rows(few + [t + DAY for t in few], "live"))
    assert g2.score_kind == "backtest"  # 월요일 30개 + 화요일 30개 = 60행이지만 주는 30개


def test_weekly_only_is_noop_on_backtest_grid() -> None:
    rows = _rows(weekly_grid(MONDAY, MONDAY + 30 * WEEK), "backtest")
    assert weekly_only(rows) == rows
    assert all(on_weekly_grid(int(r.as_of.timestamp())) for r in rows)

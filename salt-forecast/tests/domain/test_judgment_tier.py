"""판단 라벨 등급 — 사전등록 judgment-tier@1 의 경계(허용 · 거절 표)."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest

from salt_forecast.domain.judgment_tier import (
    EMPTY,
    CellStat,
    Previous,
    Row,
    decide,
    effective_n,
    halves,
    holm,
    measure,
    round_trip,
)

NOW = datetime(2026, 11, 11, tzinfo=UTC)


def _rows(days: int, per_day: list[tuple[str, float]], start: date = date(2026, 1, 1)) -> list[Row]:
    out: list[Row] = []
    for i in range(days):
        d = start + timedelta(days=i)
        at = datetime(d.year, d.month, d.day, 1, tzinfo=UTC)
        out += [Row(d, at, a, r) for a, r in per_day]
    return out


_BASE = CellStat(
    rows=100, days=50, candidates=50, avoids=50, effective_n=700.0, spread=0.01,
    ci_low=0.002, ci_high=0.02, p=0.001, discarded=0,
)  # fmt: skip


def _stat(**kw: Any) -> CellStat:
    return replace(_BASE, **kw)


def test_effective_n_by_rho() -> None:
    # 10 날 × 날마다 3행, ρ 0.5 → 10 × 3 / 2 = 15 · ρ 0 이면 30 · 행 없는 날은 세지 않는다
    assert effective_n([3] * 10, 0.5) == pytest.approx(15.0)
    assert effective_n([3] * 10, 0.0) == pytest.approx(30.0)
    assert effective_n([3] * 10 + [0], 0.5) == pytest.approx(15.0)
    assert effective_n([], 0.5) == 0.0


def test_candidate_cost_by_market_and_year() -> None:
    assert round_trip("crypto", date(2026, 1, 1)) == pytest.approx(0.001)
    assert round_trip("kr", date(2026, 3, 1)) == pytest.approx(0.000186 * 2 + 0.002)
    assert round_trip("kr", date(2025, 3, 1)) == pytest.approx(0.000186 * 2 + 0.0015)


def test_spread_is_excess_over_same_day_mean_after_candidate_cost() -> None:
    # 날 평균 = (0.03 + 0.01 + 0.02)/3 = 0.02 → 후보 초과 = 0.03 − 0.001 − 0.02 · 피하기 초과 = 0.01 − 0.02
    rows = _rows(1, [("review_short_opportunity", 0.03), ("avoid", 0.01), ("wait", 0.02)])
    s = measure(rows, "crypto", reps=10)
    assert s.spread == pytest.approx((0.03 - 0.001 - 0.02) - (0.01 - 0.02))
    assert (s.candidates, s.avoids, s.rows, s.days) == (1, 1, 3, 1)


def test_no_candidate_means_no_spread_and_no_ci() -> None:
    s = measure(_rows(30, [("avoid", -0.01), ("wait", 0.0)]), "crypto")
    assert s.spread is None and s.ci_low is None and s.p is None
    assert s.avoids == 30 and s.candidates == 0


def test_bootstrap_is_deterministic_and_ci_brackets_spread() -> None:
    rows = _rows(40, [("review_accumulation", 0.02), ("avoid", -0.01), ("wait", 0.0)])
    rows += _rows(40, [("review_accumulation", -0.005), ("avoid", 0.001)], start=date(2026, 3, 1))
    a, b = measure(rows, "crypto"), measure(rows, "crypto")
    assert a == b
    assert a.ci_low is not None and a.ci_high is not None and a.spread is not None
    assert a.ci_low <= a.spread <= a.ci_high
    assert a.p is not None and 0 < a.p <= 1


def test_halves_split_by_day_odd_middle_goes_first() -> None:
    rows = _rows(3, [("review_accumulation", 0.0), ("avoid", 0.0)])
    rows[0] = Row(rows[0].day, rows[0].judged_at, "review_accumulation", 0.05)
    first, second = halves(rows, "crypto")
    assert first is not None and second is not None
    assert first > second  # 첫 날(앞 절반 · 날 2개)만 후보가 이겼다
    assert halves(_rows(1, [("avoid", 0.0)]), "crypto") == (None, None)


def test_holm_monotone() -> None:
    assert holm([0.01, 0.04, 0.03]) == pytest.approx([0.03, 0.06, 0.06])


# ── 결정 표 ───────────────────────────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    ("promote", "p_holm", "regimes", "tier", "reason"),
    [
        (_stat(), 0.01, (0.01, 0.02), "verified", None),
        (_stat(effective_n=619.9), 0.01, (0.01, 0.02), "reference", "below_effective_n"),
        (_stat(), 0.05, (0.01, 0.02), "reference", "ci_includes_zero"),
        (_stat(), 0.01, (0.01, -0.001), "reference", "regimes_disagree"),
        (_stat(), 0.01, (0.01, None), "reference", "regimes_disagree"),
        (_stat(candidates=0, spread=None, p=None, ci_low=None, ci_high=None), None, (None, None), "reference",
         "no_candidate"),
        (_stat(avoids=0, spread=None, p=None, ci_low=None, ci_high=None), None, (None, None), "reference",
         "no_avoid"),
    ],
)  # fmt: skip
def test_decide_table(
    promote: CellStat, p_holm: float | None, regimes: tuple[float | None, float | None], tier: str, reason: str | None
) -> None:
    d = decide(
        live=promote, promote=promote, promote_p_holm=p_holm, regimes=regimes,
        backtest_full=None, recent=EMPTY, previous=None, now=NOW,
    )  # fmt: skip
    assert (d.tier, d.reason) == (tier, reason)
    assert (d.basis_source is None) == (tier == "reference")


def test_caution_live_or_backtest_full_ci_high_below_zero() -> None:
    neg = _stat(spread=-0.01, ci_low=-0.02, ci_high=-0.0001, p=0.99)
    edge = _stat(spread=-0.01, ci_low=-0.02, ci_high=0.0, p=0.9)
    common = dict(promote_p_holm=None, regimes=(None, None), recent=EMPTY, previous=None, now=NOW)
    assert decide(live=neg, promote=neg, backtest_full=None, **common).basis_source == "live"  # type: ignore[arg-type]
    d = decide(live=edge, promote=edge, backtest_full=neg, **common)  # type: ignore[arg-type]
    assert (d.tier, d.basis_source) == ("caution", "backtest_full")
    d = decide(live=edge, promote=edge, backtest_full=edge, **common)  # type: ignore[arg-type]
    assert d.tier == "reference"  # 상한 0 은 '0 미만'이 아니다


def test_verified_beats_backtest_caution() -> None:
    neg = _stat(spread=-0.01, ci_low=-0.02, ci_high=-0.001)
    d = decide(
        live=_stat(), promote=_stat(), promote_p_holm=0.01, regimes=(0.01, 0.01),
        backtest_full=neg, recent=EMPTY, previous=None, now=NOW,
    )  # fmt: skip
    assert (d.tier, d.basis_source) == ("verified", "live")


def test_demotion_needs_new_data_to_promote_again() -> None:
    bad_recent = _stat(spread=-0.01, ci_low=-0.02, ci_high=-0.001)
    d = decide(
        live=_stat(), promote=_stat(), promote_p_holm=0.01, regimes=(0.01, 0.01),
        backtest_full=None, recent=bad_recent, previous=Previous("verified", None), now=NOW,
    )  # fmt: skip
    assert (d.tier, d.demoted_at) == ("reference", NOW)
    # 직전이 참고면 13주 창은 강등을 만들지 않는다(주의는 전체 CI 로만)
    d = decide(
        live=_stat(), promote=_stat(), promote_p_holm=0.5, regimes=(0.01, 0.01),
        backtest_full=None, recent=bad_recent, previous=Previous("reference", None), now=NOW,
    )  # fmt: skip
    assert (d.tier, d.demoted_at) == ("reference", None)
    # 강등 시각은 다음 실행에도 그대로 이어진다
    earlier = NOW - timedelta(days=5)
    d = decide(
        live=_stat(), promote=EMPTY, promote_p_holm=None, regimes=(None, None),
        backtest_full=None, recent=EMPTY, previous=Previous("reference", earlier), now=NOW,
    )  # fmt: skip
    assert d.demoted_at == earlier

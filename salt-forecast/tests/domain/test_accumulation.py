"""밴드 적립 domain — 밴드 경계 · 지표 시점 고정 · 신선도 · 라벨 닫힘 · 검산 · 실패 사례 · 김프(band-accumulation@2)."""

from __future__ import annotations

import math
from datetime import UTC, datetime

import numpy as np
import pytest

from salt_forecast.domain.accumulation import (
    BTC_BANDS,
    DAY,
    HORIZON,
    KOSPI_BANDS,
    LABEL_LAG,
    WEEK,
    CaseRule,
    Week,
    band_of,
    btc_reading,
    evaluate,
    failure_cases,
    gate,
    is_closed,
    kimchi_premium,
    kospi_reading,
    label_return,
    mondays,
)
from salt_forecast.domain.asof_series import VintagedSeries


def _ts(*a: int) -> int:
    return int(datetime(*a, tzinfo=UTC).timestamp())


def _series(obs: list[int], vals: list[float], lag: int) -> VintagedSeries:
    o = np.asarray(obs, dtype=np.int64)
    return VintagedSeries.build(o, o + lag, np.asarray(vals, dtype=np.float64))


@pytest.mark.parametrize(
    ("z", "key", "m"),
    [(-0.01, "extreme_low", 3.0), (0.0, "low", 2.0), (1.99, "low", 2.0), (2.0, "neutral", 1.0), (5.0, "high", 0.5),
     (6.99, "high", 0.5), (7.0, "extreme_high", 0.0), (40.0, "extreme_high", 0.0)],
)  # fmt: skip
def test_btc_band_edges(z: float, key: str, m: float) -> None:
    b = band_of(z, BTC_BANDS)
    assert (b.key, b.multiplier) == (key, m)


@pytest.mark.parametrize(
    ("p", "key", "m"),
    [(0.0, "extreme_low", 3.0), (0.2, "low", 2.0), (0.5, "neutral", 1.0), (0.8, "high", 0.5),
     (0.95, "extreme_high", 0.25),
     (1.0, "extreme_high", 0.25)],
)  # fmt: skip
def test_kospi_band_edges_never_zero(p: float, key: str, m: float) -> None:
    b = band_of(p, KOSPI_BANDS)
    assert (b.key, b.multiplier) == (key, m)
    assert min(x.multiplier for x in KOSPI_BANDS) > 0  # 지수 적립은 0x 를 만들지 않는다


def test_band_nan_raises() -> None:
    with pytest.raises(ValueError):
        band_of(math.nan, BTC_BANDS)


def _btc(days: int, mc0: float = 100.0) -> tuple[VintagedSeries, VintagedSeries, list[int]]:
    obs = [_ts(2015, 1, 1) + i * DAY for i in range(days)]
    mcs = [mc0 * (1 + 0.001 * i) for i in range(days)]
    return _series(obs, [2.0] * days, 2 * DAY), _series(obs, mcs, 2 * DAY), obs


def test_btc_reading_matches_formula_and_needs_a_year() -> None:
    mvrv, mcap, obs = _btc(400)
    t = obs[-1] + 2 * DAY
    r = btc_reading(t, mvrv, mcap)
    assert r is not None
    mc = 100.0 * (1 + 0.001 * 399)
    sd = float(np.std(np.array([100.0 * (1 + 0.001 * i) for i in range(400)]), ddof=1))
    assert r.value == pytest.approx((mc - mc / 2.0) / sd)
    short_m, short_c, sobs = _btc(300)
    assert btc_reading(sobs[-1] + 2 * DAY, short_m, short_c) is None  # 365일 미만


def test_btc_reading_ignores_unavailable_and_stale() -> None:
    mvrv, mcap, obs = _btc(400)
    t = obs[-1] + 1 * DAY  # 마지막 날은 아직 모른다(+2일)
    r = btc_reading(t, mvrv, mcap)
    assert r is not None and r.basis_observed == obs[-2]
    assert btc_reading(obs[-1] + 2 * DAY + 8 * DAY, mvrv, mcap) is None  # 7일 넘게 묵음


def _kospi(months: int) -> tuple[VintagedSeries, VintagedSeries]:
    starts = [_ts(2004 + (i // 12), i % 12 + 1, 1) for i in range(months)]
    pers = [10.0 + (i % 10) for i in range(months)]
    ends: list[int] = []
    for s in starts:
        d = datetime.fromtimestamp(s, tz=UTC)
        ends.append(_ts(d.year + (d.month == 12), d.month % 12 + 1, 1) - DAY)
    per = VintagedSeries.build(
        np.asarray(starts, dtype=np.int64),
        np.asarray(ends, dtype=np.int64) + 50 * DAY,
        np.asarray(pers, dtype=np.float64),
    )
    days: list[int] = [_ts(2004, 1, 1) + i * DAY for i in range(months * 31 + 120)]
    idx = _series(days, [100.0] * len(days), DAY)
    return per, idx


def test_kospi_percentile_uses_only_known_months_and_estimate() -> None:
    per, idx = _kospi(70)
    t = int(per.available.max()) + DAY
    r = kospi_reading(t, per, idx, None)
    assert r is not None
    known = per.value[per.available <= t]
    assert r.value == pytest.approx(
        float(per.value[np.argmax(per.observed[per.available <= t])])
    )  # 지수 그대로면 추정 = PER
    assert r.percentile == pytest.approx(float(np.count_nonzero(known <= r.value)) / known.size)
    per59, idx59 = _kospi(59)
    assert kospi_reading(int(per59.available.max()) + DAY, per59, idx59, None) is None  # 60달 미만


def test_kospi_stale_after_130_days() -> None:
    per, idx = _kospi(70)
    last_obs = int(per.observed.max())
    assert kospi_reading(last_obs + 129 * DAY, per, idx, None) is not None
    assert kospi_reading(last_obs + 131 * DAY, per, idx, None) is None


def test_label_closed_only_after_horizon_and_lag() -> None:
    t = _ts(2020, 1, 6)
    assert not is_closed(t, t + HORIZON + LABEL_LAG - 1)
    assert is_closed(t, t + HORIZON + LABEL_LAG)
    obs = [t - DAY, t + HORIZON - DAY]
    price = _series(obs, [100.0, 150.0], 2 * DAY)
    assert label_return(t, price) == pytest.approx(0.5)


def _weeks(ms: list[float], rs: list[float]) -> list[Week]:
    base = _ts(2010, 1, 4)
    return [Week(base + i * WEEK, m, "x", r) for i, (m, r) in enumerate(zip(ms, rs, strict=True))]


def test_constant_multiplier_never_beats_flat() -> None:
    n = 300
    rs = list(np.random.default_rng(1).normal(0.1, 0.3, n))
    s = evaluate(_weeks([1.0] * n, rs), [100.0] * n)
    assert s.excess == pytest.approx(0.0, abs=1e-12)
    assert not gate(s, True).passed


def test_multiplier_that_tracks_returns_passes_and_is_deterministic() -> None:
    rng = np.random.default_rng(2)
    rs = rng.normal(0.0, 0.3, 400)
    ms = [3.0 if r > 0 else 0.5 for r in rs]
    a = evaluate(_weeks(ms, list(rs)), [100.0] * 400)
    b = evaluate(_weeks(ms, list(rs)), [100.0] * 400)
    assert a == b
    assert a.excess is not None and a.excess > 0 and a.ci_low is not None and a.ci_low > 0
    assert gate(a, True).passed
    assert gate(a, False).reason == "stale_inputs"


def test_gate_needs_260_closed_weeks() -> None:
    rng = np.random.default_rng(3)
    rs = rng.normal(0.0, 0.3, 259)
    s = evaluate(_weeks([3.0 if r > 0 else 0.5 for r in rs], list(rs)), [100.0] * 259)
    assert gate(s, True).reason == "insufficient_sample"


def test_open_weeks_not_scored() -> None:
    ws = [*_weeks([2.0, 2.0], [0.1, 0.2]), Week(_ts(2030, 1, 7), 3.0, "x", None)]
    assert evaluate(ws, [1.0, 1.0, 1.0]).n == 2


def test_failure_cases_dedupe_and_top3() -> None:
    rule = CaseRule(-0.3, 0.5, -0.5)
    ws = _weeks(
        [2.0, 2.0, 2.0, 0.5, 1.0, 1.0, 2.0],
        [-0.31, -0.40, 0.1, 0.9, -0.6, -0.1, -0.35],
    )
    # 0 · 1 주는 같은 사례(26주 안) → 가장 나쁜 1주만. 6주는 같은 종류지만 5주 뒤라 같은 사례
    ws[6] = Week(ws[0].t + 40 * WEEK, 2.0, "x", -0.35)
    cases, total = failure_cases(ws, rule)
    assert total == 4
    assert [c.kind for c in cases] == ["wrong_expensive", "missed_drop", "wrong_cheap"]
    assert cases[2].ret == -0.40


def test_kimchi_formula_and_skew() -> None:
    t = _ts(2026, 11, 16)
    up = (np.asarray([t - DAY], dtype=np.int64), np.asarray([103_000.0]))
    bn = (np.asarray([t - DAY], dtype=np.int64), np.asarray([70.0]))
    fx = _series([t - 2 * DAY], [1_400.0], DAY)
    k = kimchi_premium(t, up, bn, fx)
    assert k is not None and k.premium == pytest.approx(103_000 / (70 * 1_400) - 1)
    far = _series([t - 6 * DAY], [1_400.0], DAY)
    assert kimchi_premium(t, up, bn, far) is None


def test_mondays() -> None:
    ds = mondays(_ts(2026, 11, 11), _ts(2026, 11, 30))
    assert [datetime.fromtimestamp(d, tz=UTC).date().isoformat() for d in ds] == [
        "2026-11-16",
        "2026-11-23",
        "2026-11-30",
    ]


def test_positive_mean_with_interval_crossing_zero_fails() -> None:
    """평균은 이겼어도 90% 하한이 0 이하면 관문 실패 — 운으로 이긴 것과 구분한다(사전등록 [gate])."""
    rng = np.random.default_rng(3)
    rs = rng.normal(0, 0.3, 300)
    ms = list(rng.choice([0.5, 1.0, 2.0], 300))
    s = evaluate(_weeks(ms, list(rs)), [100.0] * 300)
    assert s.excess is not None and s.excess > 0
    assert s.ci_low is not None and s.ci_low <= 0
    assert gate(s, True).reason == "not_better_than_flat"

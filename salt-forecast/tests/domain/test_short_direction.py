"""short-direction@1 순수 계산 — 경계 표 · 판정 순서 · 직렬화 · 셔플 · 분위(FC-REQ-028 FR-1)."""

from __future__ import annotations

import math

import numpy as np
import pytest

from salt_forecast.domain.panel import Panel
from salt_forecast.domain.series import DAY
from salt_forecast.domain.short_direction import (
    CRYPTO_UNIVERSE_TOP,
    HOUR,
    CellResult,
    Fit,
    Rows,
    WalkSpec,
    crypto_cell_panel,
    crypto_universe,
    decide,
    evaluate,
    live_quantiles,
    live_underperforms,
    shuffle_within_day,
    walk_forward,
)

T0 = 1_735_689_600  # 2025-01-01 00:00 UTC


def hourly_panel(n_hours: int, n_sym: int, seed: int = 1, value_scale: np.ndarray | None = None) -> Panel:
    rng = np.random.default_rng(seed)
    dates = T0 + HOUR * np.arange(1, n_hours + 1, dtype=np.int64)  # 행 = 봉 마감
    r = rng.normal(0, 0.01, size=(n_hours, n_sym))
    close = 100 * np.exp(np.cumsum(r, axis=0))
    open_ = np.vstack([close[:1], close[:-1]])
    vol = rng.uniform(1, 2, size=(n_hours, n_sym)) * (1.0 if value_scale is None else value_scale[None, :])
    syms = tuple(["KRW-BTC"] + [f"KRW-C{i:03d}" for i in range(1, n_sym)])
    return Panel(dates, syms, close * 1.01, close * 0.99, close, vol, np.zeros(n_sym, dtype=np.int64), open_)


def make_rows(x: np.ndarray, y: np.ndarray, t: np.ndarray, per_day: int = 24) -> Rows:
    n = t.size
    return Rows(
        t.astype(np.int64),
        T0 + t.astype(np.int64) * HOUR,
        (t // per_day).astype(np.int64),
        np.zeros(n, dtype=np.intp),
        x,
        y,
        np.where(np.isnan(y), np.nan, np.where(y > 0, 0.01, -0.01)),
        np.full(n, 0.0015),
        np.full(n, 0.01),
        np.where(x[:, 0] > 0, 1.0, -1.0),
    )


SPEC = WalkSpec(
    horizon=1, retrain_every=24 * 7, train_span=24 * 120, min_train=24 * 60, embargo=24, cal_span=24 * 100, boot_block=7
)


def test_universe_uses_previous_day_value_only() -> None:
    scale = np.ones(60)
    scale[5] = 1000.0  # C005 가 늘 거래대금 1위
    p = hourly_panel(24 * 40, 60, value_scale=scale)
    u = crypto_universe(p)
    day = (p.dates - 1) // DAY
    # 720시간이 차기 전(처음 30일)은 봉 수 ≥ 600 을 못 넘는 날이 있다 — 그 뒤로는 날마다 정확히 50
    late = u[day >= day[0] + 31]
    assert (late.sum(axis=1) == CRYPTO_UNIVERSE_TOP).all()
    assert late[:, 5].all()
    # 그날 거래대금을 바꿔도 그날 유니버스는 같다(전날 경계 기준)
    p2 = Panel(p.dates, p.symbols, p.high, p.low, p.close, p.volume.copy(), p.listed_at, p.open)
    last_day = day == day[-1]
    p2.volume[last_day, 7] *= 1e6
    assert (crypto_universe(p2)[last_day] == u[last_day]).all()


def test_features_never_read_future_rows() -> None:
    p = hourly_panel(24 * 40, 55)
    full = crypto_cell_panel(p)
    k = 24 * 35
    cut = Panel(p.dates[:k], p.symbols, p.high[:k], p.low[:k], p.close[:k], p.volume[:k], p.listed_at, p.open[:k])  # type: ignore[index]
    part = crypto_cell_panel(cut)
    for a, b in zip(full.features, part.features, strict=True):
        np.testing.assert_array_equal(a[:k], b)
    np.testing.assert_array_equal(full.sigma[:k], part.sigma)
    np.testing.assert_array_equal(full.universe[:k], part.universe)


def test_day_momentum_resets_at_kst_nine() -> None:
    p = hourly_panel(48, 3)
    cp = crypto_cell_panel(p)
    # 00:00 UTC 시작 봉(마감 01:00) 의 일중 수익 = ln(C / O) of that same bar
    i = 24  # dates[24] = T0 + 25h → 봉 시작 01:00 UTC 다음날? 계산으로 찾는다
    starts = np.flatnonzero(((p.dates - HOUR) % DAY) == 0)
    i = int(starts[1])
    assert p.open is not None
    expect = math.log(p.close[i, 1] / p.open[i, 1]) / (cp.sigma[i, 1] * 1.0) if np.isfinite(cp.sigma[i, 1]) else np.nan
    got = cp.features[3][i, 1]
    if np.isfinite(expect):
        assert got == pytest.approx(max(-5, min(5, expect)))


def test_walk_forward_embargo_and_base_rate() -> None:
    rng = np.random.default_rng(3)
    n = 24 * 200
    t = np.arange(n)
    x = rng.normal(size=(n, 2))
    y = (rng.random(n) < 0.6).astype(np.float64)
    rows = make_rows(x, y, t)
    wf = walk_forward(rows, SPEC, n - 1)
    start = SPEC.min_train
    hi = start - SPEC.embargo - SPEC.horizon
    expect = y[(t >= start - SPEC.train_span) & (t <= hi)].mean()
    assert wf.base[start] == pytest.approx(expect)
    assert np.isnan(wf.p[:start]).all()  # 첫 블록 전은 OOS 없음
    assert wf.last_fit is not None
    # 마지막 행(라이브)도 예측됐다
    assert np.isfinite(wf.p[-1])


def test_planted_signal_passes_and_noise_fails() -> None:
    rng = np.random.default_rng(5)
    n = 24 * 260
    t = np.arange(n)
    x = rng.normal(size=(n, 2))
    signal = (rng.random(n) < 1 / (1 + np.exp(-1.2 * x[:, 0]))).astype(np.float64)
    noise = (rng.random(n) < 0.5).astype(np.float64)
    cells: list[CellResult] = []
    for y in (signal, noise):
        rows = make_rows(x, y, t)
        wf = walk_forward(rows, SPEC, n - 1)
        res = evaluate("crypto", "1h", rows, wf, SPEC)
        sh = shuffle_within_day(y, rows.day, 7)
        srows = make_rows(x, sh, t)
        s = evaluate("crypto", "1h", srows, walk_forward(srows, SPEC, n - 1), SPEC)
        res.shuffle_lo, res.shuffle_hi = s.bss_lo, s.bss_hi
        cells.append(res)
    decide(cells)
    assert cells[0].bss_lo > 0
    assert cells[0].confident >= 300
    assert cells[1].status == "fail" and cells[1].reason == "no_skill"


@pytest.mark.parametrize(
    ("patch", "reason"),
    [
        ({"shuffle_lo": 0.01}, "shuffle_failed"),
        ({"bss_lo": -0.01}, "no_skill"),
        ({"bss_persistence": -0.01}, "no_skill"),
        ({"bss_p": 0.2}, "no_skill"),
        ({"ece": 0.031}, "miscalibrated"),
        ({"confident": 299}, "no_edge_confident"),
        ({"hit_diff_lo": -0.001}, "no_edge_confident"),
        ({"net_mean": 0.0}, "cost"),
        ({}, None),
        ({"rows": 0}, "no_skill"),
        ({"ece": 0.5, "net_mean": -1.0}, "miscalibrated"),  # 처음 걸린 것 하나
    ],
)
def test_decide_boundary_table(patch: dict[str, float], reason: str | None) -> None:
    base = {
        "rows": 1000, "bss": 0.01, "bss_lo": 0.001, "bss_hi": 0.02, "bss_p": 0.001, "bss_persistence": 0.005,
        "ece": 0.03,
        "confident": 300, "hit_diff_lo": 0.001, "net_mean": 0.0001, "shuffle_lo": -0.01, "shuffle_hi": 0.01,
    }  # fmt: skip
    c = CellResult("crypto", "1h")
    for k, v in {**base, **patch}.items():
        setattr(c, k, v)
    decide([c])
    assert c.reason == reason
    assert c.status == ("pass" if reason is None else "fail")


def test_holm_family_raises_bar() -> None:
    cells = [CellResult("crypto", h) for h in ("1h", "4h", "1d")]
    for c, p in zip(cells, (0.02, 0.5, 0.5), strict=True):
        c.rows, c.bss_p, c.bss_lo, c.bss_persistence, c.ece = 1000, p, 0.001, 0.01, 0.01
        c.confident, c.hit_diff_lo, c.net_mean, c.shuffle_lo, c.shuffle_hi = 400, 0.01, 0.001, -1, 1
    decide(cells)
    assert cells[0].bss_p_holm == pytest.approx(0.06)
    assert cells[0].reason == "no_skill"  # 혼자면 0.02 로 통과 — 가족 셋이라 못 넘는다


def test_shuffle_keeps_day_multiset_and_nans() -> None:
    y = np.array([1, 0, 1, np.nan, 0, 0, 1, 1], dtype=np.float64)
    day = np.array([0, 0, 0, 0, 1, 1, 1, 1], dtype=np.int64)
    s = shuffle_within_day(y, day, 1)
    assert np.isnan(s[3])
    for d in (0, 1):
        assert sorted(s[(day == d) & ~np.isnan(s)]) == sorted(y[(day == d) & ~np.isnan(y)])


def test_fit_json_roundtrip_predicts_same() -> None:
    rng = np.random.default_rng(9)
    n = 24 * 120
    x = rng.normal(size=(n, 3))
    y = (rng.random(n) < 1 / (1 + np.exp(-x[:, 0]))).astype(np.float64)
    rows = make_rows(x, y, np.arange(n))
    wf = walk_forward(rows, SPEC, n - 1)
    assert wf.last_fit is not None
    back = Fit.from_json(wf.last_fit.to_json())
    np.testing.assert_allclose(back.predict(x[-50:]), wf.last_fit.predict(x[-50:]))


def test_live_quantiles_bins_and_missing() -> None:
    zq = {"low": (-2.0, -0.5, 1.0), "high": (-1.0, 0.5, 2.0)}
    assert live_quantiles(zq, 0.40, 0.01) == pytest.approx((-0.02, -0.005, 0.01))
    assert live_quantiles(zq, 0.60, 0.01) == pytest.approx((-0.01, 0.005, 0.02))
    assert live_quantiles(zq, 0.50, 0.01) is None  # mid 분위 없음 → 지어내지 않는다


def test_live_underperforms_needs_300_confident() -> None:
    days = np.repeat(np.arange(100), 3).astype(np.int64)
    p = np.full(300, 0.6)
    up = np.zeros(300)  # 전부 빗나감 — 늘 오른다(0)와 같다 → 차 0, 상한 < 0 아님
    assert not live_underperforms(p[:299], up[:299], days[:299], 7)
    p_dn = np.full(300, 0.4)
    up_all = np.ones(300)  # '내림' 확신 전부 틀림 · 늘 오른다 전부 맞음 → 차 −1
    assert live_underperforms(p_dn, up_all, days, 7)


def test_narrow_to_universe_keeps_rows_identical() -> None:
    from salt_forecast.domain.panel import forward_log_return
    from salt_forecast.domain.short_direction import cell_rows, narrow_to_universe

    p = hourly_panel(24 * 40, 70)
    full = crypto_cell_panel(p)
    sub, u = narrow_to_universe(p)
    assert len(sub.symbols) < len(p.symbols)  # 실제로 좁혔다
    part = crypto_cell_panel(sub, universe=u)
    day = ((p.dates - 1) // DAY).astype(np.int64)
    a = cell_rows(full, 4, forward_log_return(p, 4), 0.0015, day)
    b = cell_rows(part, 4, forward_log_return(sub, 4), 0.0015, day)
    np.testing.assert_array_equal(a.x, b.x)
    np.testing.assert_array_equal(a.y, b.y)
    assert [p.symbols[i] for i in a.sym] == [sub.symbols[i] for i in b.sym]

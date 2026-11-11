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
    ForwardMetrics,
    ForwardSample,
    Rows,
    WalkSpec,
    crypto_cell_panel,
    crypto_universe,
    evaluate,
    featureless,
    forward_judge,
    forward_metrics,
    is_look,
    live_quantiles,
    live_underperforms,
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


def test_planted_signal_shows_skill_and_noise_does_not() -> None:
    rng = np.random.default_rng(5)
    n = 24 * 260
    t = np.arange(n)
    x = rng.normal(size=(n, 2))
    signal = (rng.random(n) < 1 / (1 + np.exp(-1.2 * x[:, 0]))).astype(np.float64)
    noise = (rng.random(n) < 0.5).astype(np.float64)
    out: list[CellResult] = []
    for y in (signal, noise):
        rows = make_rows(x, y, t)
        ref = walk_forward(featureless(rows), SPEC, n - 1)
        out.append(evaluate("crypto", "1h", rows, walk_forward(rows, SPEC, n - 1), SPEC, ref))
    assert out[0].bss_lo > 0 and out[0].confident >= 300
    assert out[1].bss_lo <= 0


def _m(**over: float) -> ForwardMetrics:
    base: dict[str, float] = {
        "rows": 5000, "days": 40, "bss": 0.01, "bss_lo": 0.001, "bss_hi": 0.02, "bss_p": 0.001, "ece": 0.02,
        "confident": 400, "hits": 240, "majority_hits": 220, "edge_lo": 0.001, "edge_hi": 0.1, "up_calls": 50,
        "net_mean": 0.001,
    }  # fmt: skip
    base.update(over)
    return ForwardMetrics(
        int(base["rows"]), int(base["days"]), base["bss"], base["bss_lo"], base["bss_hi"], base["bss_p"], base["ece"],
        int(base["confident"]), int(base["hits"]), int(base["majority_hits"]), base["edge_lo"], base["edge_hi"],
        int(base["up_calls"]), base["net_mean"],
    )  # fmt: skip


@pytest.mark.parametrize(
    ("over", "mid", "last"),
    [
        ({}, ("pass", None), ("pass", None)),
        ({"days": 29}, ("forward", "awaiting_live"), ("fail", "no_skill")),  # 날 < 30 — 이번엔 보류
        ({"bss_lo": 0.0}, ("forward", "awaiting_live"), ("fail", "no_skill")),
        ({"bss_p": 0.02}, ("forward", "awaiting_live"), ("fail", "no_skill")),  # α 0.05/3 = 0.0167 넘음
        ({"ece": 0.031}, ("forward", "awaiting_live"), ("fail", "miscalibrated")),
        ({"confident": 299}, ("forward", "awaiting_live"), ("fail", "no_edge_confident")),
        ({"edge_lo": 0.0}, ("forward", "awaiting_live"), ("fail", "no_edge_confident")),
        ({"net_mean": 0.0}, ("forward", "awaiting_live"), ("fail", "cost")),
        (
            {"net_mean": -1.0, "up_calls": 29},
            ("pass", None),
            ("pass", None),
        ),  # '오름'을 거의 말하지 않으면 비용 항목 없음
        ({"ece": 0.5, "net_mean": -1.0}, ("forward", "awaiting_live"), ("fail", "miscalibrated")),  # 처음 걸린 것
    ],
)
def test_forward_judge_boundary_table(
    over: dict[str, float], mid: tuple[str, str | None], last: tuple[str, str | None]
) -> None:
    assert forward_judge({"crypto:1h": _m(**over)}, 0)["crypto:1h"] == mid
    assert forward_judge({"crypto:1h": _m(**over)}, 2)["crypto:1h"] == last


def test_forward_judge_holm_across_cells() -> None:
    cells = {"a": _m(bss_p=0.01), "b": _m(bss_p=0.5), "c": _m(bss_p=0.5)}
    assert forward_judge(cells, 2)["a"] == ("fail", "no_skill")  # 혼자면 0.01 < 0.0167 — 셋이라 0.03
    assert forward_judge({"a": _m(bss_p=0.01)}, 2)["a"] == ("pass", None)


def test_look_dates() -> None:
    assert is_look("2027-01-10") == 0 and is_look("2027-03-11") == 2 and is_look("2027-01-11") is None


def test_forward_metrics_majority_side_not_always_up() -> None:
    """오른 비율 30% · 모델이 늘 '안 오름'만 말하면 확신 적중 = 늘 많은 쪽 — 차 0 근처(@2 결함 회귀)."""
    rng = np.random.default_rng(2)
    n = 3000
    y = (rng.random(n) < 0.3).astype(np.float64)
    p = np.full(n, 0.3)
    day = (np.arange(n) // 30).astype(np.int64)
    m = forward_metrics(ForwardSample(p, np.full(n, 0.3), y, np.where(y > 0, 0.01, -0.01), np.zeros(n), day), 7)
    assert m.hits == m.majority_hits
    assert m.edge_lo <= 0 <= m.edge_hi
    assert m.bss == pytest.approx(0.0)


def test_regime_only_beats_climatology_but_not_reference() -> None:
    """@1 결함 회귀 — 피처 정보 0 · 오른 비율만 몇 주씩 오르내리는 데이터.

    기후값(365일)은 이기지만 @2 기준(피처 없는 같은 보정)으론 실력 0."""
    rng = np.random.default_rng(11)
    n = 24 * 300
    t = np.arange(n)
    x = rng.normal(size=(n, 3))
    regime = 0.5 + 0.12 * np.sin(2 * np.pi * t / (24 * 70))  # 70일 주기 '요즘 분위기'
    y = (rng.random(n) < regime).astype(np.float64)
    rows = make_rows(x, y, t)
    wf = walk_forward(rows, SPEC, n - 1)
    res = evaluate("crypto", "1h", rows, wf, SPEC, walk_forward(featureless(rows), SPEC, n - 1))
    assert res.bss_climatology > 0  # @1 기준이었다면 '실력'으로 보였다
    assert res.bss_lo <= 0  # 피처 몫은 없다


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


def test_sigma_skips_holes_like_preregistration() -> None:
    """σ = 값이 있는 마지막 168개 — 점검 시간처럼 봉이 빈 칸을 건너뛴다(구멍 하나로 일주일 NaN 이던 결함 회귀)."""
    from salt_forecast.domain.short_direction import _last_n_std  # pyright: ignore[reportPrivateUsage]

    rng = np.random.default_rng(4)
    m = rng.normal(size=(400, 1))
    m[250:255, 0] = np.nan  # 점검 다섯 시간
    out = _last_n_std(m, 168)
    vals = m[np.isfinite(m[:, 0]), 0]
    assert np.isnan(out[166, 0]) and np.isfinite(out[167, 0])
    assert out[260, 0] == pytest.approx(np.std(vals[260 - 5 - 167 : 260 - 5 + 1], ddof=1))
    assert np.isnan(out[252, 0])  # 값이 없는 행은 NaN
    assert np.isfinite(out[399, 0])


@pytest.mark.parametrize(
    ("market", "as_of", "exp", "now", "ok"),
    [
        ("crypto", 0, 3600, 0, True),
        ("crypto", 0, 3600, 900, True),
        ("crypto", 0, 3600, 901, False),  # 15분 넘으면 버림 — 봉 1시간의 4분의 1을 이미 봤다
        ("crypto", 100, 3700, 50, False),  # 기준 봉보다 먼저 쓸 수 없다
        ("kr", 0, 86400, 3600, True),  # 16:00 기준 · 다음 날 16:00 만기 · 17:00 기록
        ("kr", 0, 86400, 86400 - 7 * 3600 - 1, True),  # 다음 날 08:59:59
        ("kr", 0, 86400, 86400 - 7 * 3600, False),  # 다음 날 09:00 — 장이 열렸다
        ("kr", 0, 86400, 86400 + 3600, False),  # 만기 뒤(11-11 에 실제로 났던 결함)
    ],
)
def test_written_in_time_boundary_table(market: str, as_of: int, exp: int, now: int, ok: bool) -> None:
    from salt_forecast.domain.short_direction import written_in_time

    assert written_in_time(market, as_of, exp, now) is ok


D = 86400
_OPEN = [0, D, 4 * D]  # 거래일 as_of(09:00 KST) — 둘째 날 뒤 이틀 휴장
_PUB = 7 * 3600  # 16:00 KST 공개


@pytest.mark.parametrize(
    ("last_moved", "now", "due"),
    [
        (None, _PUB - 1, False),  # 첫 거래일 16:00 전 — 공개된 봉 없음
        (None, _PUB, True),  # 옮긴 적 없음
        (_PUB - 1, _PUB, True),  # 공개 전에 옮김 — 그 봉은 안 들어왔다
        (_PUB, _PUB + 3600, False),  # 공개 뒤 옮김
        (_PUB, D + _PUB - 1, False),  # 다음 날 16:00 전 — 새 봉 없음
        (_PUB, D + _PUB, True),  # 다음 날 봉 공개
        (D + _PUB, 3 * D, False),  # 휴장일 — 새 봉 없음
        (D + _PUB, 4 * D + _PUB + 60, True),  # 휴장 뒤 첫 거래일 공개
        (D + _PUB - 600, D + 15 * 3600, True),  # 11-12 실측 모양 — 아침에만 옮겨 그날 저녁 봉을 놓침
    ],
)
def test_kr_bar_move_due_boundary_table(last_moved: int | None, now: int, due: bool) -> None:
    from salt_forecast.domain.short_direction import kr_bar_move_due

    assert kr_bar_move_due(_OPEN, last_moved, now) is due

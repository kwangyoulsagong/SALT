"""H3 move-news@1 — 사건 · 소식 창 · 라벨 · 검정 · 판정 경계."""

from __future__ import annotations

import math
from datetime import date

import numpy as np

from salt_forecast.domain.move_news import (
    KR_NEWS_CUTOFF_S,
    MIN_DAYS,
    MIN_EVENTS,
    CellRun,
    Group,
    cooldown,
    events,
    group,
    judge,
    labels,
    look_due,
    news_counts,
    news_windows,
    placebo_flags,
    run_tests,
    sigma,
    volume_high,
)

KR_BAR = 1_762_412_400  # 2025-11-06 07:00 UTC = 16:00 KST


def test_sigma_excludes_today() -> None:
    r = np.concatenate([np.tile([0.01, -0.01], 10), [0.5]])[:, None]
    s = sigma(r)
    assert math.isclose(s[20, 0], np.std(r[:20, 0], ddof=1))
    ev = events(r, s, np.ones_like(r, dtype=bool))
    assert ev[20, 0] and not ev[:20, 0].any()


def test_event_two_sigma_edge() -> None:
    sig = np.array([[0.01]])
    assert events(np.array([[0.02]]), sig, np.array([[True]]))[0, 0]
    assert not events(np.array([[0.0199]]), sig, np.array([[True]]))[0, 0]
    assert not events(np.array([[0.05]]), sig, np.array([[False]]))[0, 0]


def test_kr_news_window_is_previous_session_1530_to_1530() -> None:
    dates = np.array([KR_BAR, KR_BAR + 86_400 * 4], dtype=np.int64)  # 목 → 다음 월(주말 건넘)
    lo, hi = news_windows("kr", dates)
    assert hi[1] == dates[1] - KR_NEWS_CUTOFF_S and lo[1] == hi[0]
    pub = {"005930": np.array([hi[0], hi[0] + 1, hi[1], hi[1] + 1], dtype=np.int64)}
    n = news_counts(pub, ["005930"], lo, hi)
    assert n[1, 0] == 2  # (전 15:30, 그날 15:30] — 왼쪽 열림 · 오른쪽 닫힘, 15:30 뒤 제목은 다음 날


def test_crypto_news_window_is_the_day() -> None:
    lo, hi = news_windows("crypto", np.array([86_400 * 10], dtype=np.int64))
    assert (lo[0], hi[0]) == (86_400 * 9, 86_400 * 10)


def test_volume_high_uses_previous_20() -> None:
    t = np.concatenate([np.ones(20), [2.0]])[:, None]
    assert volume_high(t)[20, 0]
    assert not volume_high(np.concatenate([np.ones(20), [1.99]])[:, None])[20, 0]


def test_label_direction_and_market_demeaning() -> None:
    close = np.array([[100.0, 100.0], [110.0, 100.0], [121.0, 100.0]])
    r = np.array([[np.nan, np.nan], [0.0953, -0.05], [0.0953, 0.0]])
    s = labels(close, r, np.ones((3, 2), dtype=bool), 1, None)
    up = math.log(121 / 110)
    assert math.isclose(s[1, 0], up - up / 2) and math.isclose(s[1, 1], -(0 - up / 2))
    brk = np.array([[False, False], [False, False], [True, False]])
    assert np.isnan(labels(close, r, np.ones((3, 2), dtype=bool), 1, brk)[1, 0])


def test_cooldown_drops_overlapping() -> None:
    m = np.zeros((10, 1), dtype=bool)
    m[[0, 3, 5, 9], 0] = True
    assert np.flatnonzero(cooldown(m, 5)[:, 0]).tolist() == [0, 5]
    assert np.flatnonzero(cooldown(m, 1)[:, 0]).tolist() == [0, 3, 5, 9]


def test_group_averages_dates_first() -> None:
    g = group(np.array([1, 1, 1, 2]), np.array([0.0, 0.0, 0.0, 1.0]), 1)
    assert g.events == 4 and g.days == 2 and math.isclose(g.mean, 0.5)


def _g(mean: float, se: float, n: int = MIN_EVENTS, d: int = MIN_DAYS) -> Group:
    return Group(n, d, mean, se)


def test_tests_directions_and_below_min() -> None:
    t = run_tests(_g(0.01, 0.002), _g(-0.01, 0.002))
    assert [x.below_min for x in t] == [False, False, False]
    assert all(x.p < 1e-4 for x in t)
    t2 = run_tests(_g(0.01, 0.002, d=MIN_DAYS - 1), _g(-0.01, 0.002))
    assert t2[0].below_min and t2[2].below_min and not t2[1].below_min


def _cell(tests_mean: float, placebo: bool, robust: bool) -> CellRun:
    news, quiet = _g(tests_mean, 0.001), _g(-tests_mean, 0.001)
    c = CellRun("kr", 1, news, quiet, news, 0, 0, {}, run_tests(news, quiet))
    c.placebo_pass, c.robust_same_sign = placebo, robust
    return c


def test_judge_reason_order_and_last_look() -> None:
    ok, no_eff, plac, cov = (
        _cell(0.01, True, True),
        _cell(0.0, True, True),
        _cell(0.01, False, True),
        _cell(0.01, True, False),
    )
    judge([ok, no_eff, plac, cov], 0.0166667, last_look=False)
    assert ok.status["diff"] == ("pass", None)
    assert no_eff.status["news_up"] == ("forward", "no_effect")
    assert plac.status["diff"] == ("forward", "placebo")
    assert cov.status["diff"] == ("forward", "coverage")
    judge([no_eff], 0.0166667, last_look=True)
    assert no_eff.status["diff"] == ("fail", "no_effect")


def test_placebo_moves_every_date() -> None:
    flag = np.zeros((100, 3), dtype=bool)
    flag[50, :] = True
    moved = placebo_flags(flag, np.random.default_rng(1))
    t, _ = np.nonzero(moved)
    assert not moved[50].any() and (np.abs(t - 50) <= 20).all() and t.size == 3


def test_look_due() -> None:
    assert look_due(date(2027, 1, 12), 0) == 0
    assert look_due(date(2027, 3, 14), 2) == 2
    assert look_due(date(2026, 12, 31), 0) is None

"""H1 vol-range@1 · H3 move-news@1 — 미래 오염(time-and-leakage.md §6).

as_of(행 t) 뒤 봉을 바꿔도 행 t 까지의 예측 · 컨포멀 폭 · 사건 · 소식 유무는 같아야 한다."""

from __future__ import annotations

import numpy as np

from salt_forecast.domain.move_news import events, news_counts, news_windows, sigma, volume_high
from salt_forecast.domain.series import DAY
from salt_forecast.domain.vol_range import VolPanel, conformal_q, prepare, scores, walk_forward

T0 = 1_735_689_600


def _panel(rv: np.ndarray, ret: np.ndarray) -> VolPanel:
    n, k = rv.shape
    close = 100 * np.exp(np.cumsum(ret, axis=0))
    dates = (T0 + DAY * np.arange(1, n + 1, dtype=np.int64)).astype(np.int64)
    return VolPanel("crypto", dates, tuple(f"S{j}" for j in range(k)), rv, ret, close, np.ones((n, k), bool))


def test_vol_range_future_rows_do_not_change_prediction_at_t() -> None:
    rng = np.random.default_rng(7)
    n, k, t = 700, 20, 600
    rv = np.exp(rng.normal(-8, 0.5, (n, k)))
    ret = rng.normal(0, 1, (n, k)) * np.sqrt(rv)
    a = prepare(_panel(rv, ret))
    rv2, ret2 = rv.copy(), ret.copy()
    rv2[t + 1 :] *= 9.0
    ret2[t + 1 :] *= -3.0
    b = prepare(_panel(rv2, ret2))
    for h in (1, 5):
        wa = walk_forward("crypto", a.panel.dates, a.x, a.y[h], a.base[h], a.panel.eligible, h, t)
        wb = walk_forward("crypto", b.panel.dates, b.x, b.y[h], b.base[h], b.panel.eligible, h, t)
        assert np.allclose(wa.har[: t + 1], wb.har[: t + 1], equal_nan=True)
        for name in wa.base:
            assert np.allclose(wa.base[name][: t + 1], wb.base[name][: t + 1], equal_nan=True)
        qa = conformal_q(scores(a.r[h], wa.har), h)
        qb = conformal_q(scores(b.r[h], wb.har), h)
        assert np.allclose(qa[: t + 1], qb[: t + 1], equal_nan=True)
        assert np.isfinite(qa[t]).all()  # 시험이 빈 값끼리 비교하지 않는다


def test_move_news_future_bars_and_titles_do_not_change_event_at_t() -> None:
    rng = np.random.default_rng(8)
    n, t = 60, 40
    r = rng.normal(0, 0.02, (n, 3))
    r[t, 0] = 0.2
    turnover = rng.uniform(1, 2, (n, 3))
    dates = (T0 + DAY * np.arange(n)).astype(np.int64)
    lo, hi = news_windows("crypto", dates)
    pub = {"A": np.array([dates[t] - 100], dtype=np.int64)}
    base = (events(r, sigma(r), np.ones_like(r, dtype=bool)), volume_high(turnover), news_counts(pub, ["A"], lo, hi))
    r2, t2 = r.copy(), turnover.copy()
    r2[t + 1 :] = 0.5
    t2[t + 1 :] = 100.0
    pub2 = {"A": np.array([dates[t] - 100, dates[t] + 1, dates[t] + 5000], dtype=np.int64)}
    other = (events(r2, sigma(r2), np.ones_like(r2, dtype=bool)), volume_high(t2), news_counts(pub2, ["A"], lo, hi))
    for x, y in zip(base, other, strict=True):
        assert np.array_equal(x[: t + 1], y[: t + 1])
    assert base[0][t, 0] and base[2][t, 0] == 1

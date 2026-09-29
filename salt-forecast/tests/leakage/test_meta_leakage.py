"""메타 모델 피처는 미래 행을 보지 않는다 · walk-forward 학습 행의 라벨은 재학습 시점 전에 끝난다.

time-and-leakage.md §6 — 미래 오염 · 엠바고.
"""

import numpy as np

from salt_forecast.domain.labels import ewma_sigma
from salt_forecast.domain.meta_features import FEATURES, build
from salt_forecast.domain.panel import Panel
from salt_forecast.domain.series import DAY
from salt_forecast.scoring import meta_model as mm
from salt_forecast.scoring.meta_model import Rows, walk_forward


def _panel(n: int, k: int, seed: int) -> Panel:
    rng = np.random.default_rng(seed)
    close = 100 * np.exp(np.cumsum(rng.normal(0, 0.03, size=(n, k)), axis=0))
    vol = rng.uniform(1, 10, size=(n, k))
    syms = ("KRW-BTC", *(f"KRW-{i}" for i in range(k - 1)))
    dates = np.arange(n, dtype=np.int64) * DAY
    return Panel(dates, syms, close * 1.02, close * 0.98, close, vol, np.zeros(k, np.int64))


def _head(p: Panel, n: int) -> Panel:
    return Panel(p.dates[:n], p.symbols, p.high[:n], p.low[:n], p.close[:n], p.volume[:n], p.listed_at)


def test_features_ignore_future_rows() -> None:
    longer = _panel(520, 4, 11)
    base = _head(longer, 450)
    rng = np.random.default_rng(3)
    fg = rng.uniform(10, 90, 520)
    ph = rng.random(520)
    fund = rng.normal(0, 1e-4, size=(520, 4))
    a = build(base, fg[:450], ewma_sigma(base), ph[:450], fund[:450])
    b = build(longer, fg, ewma_sigma(longer), ph, fund)
    for f in FEATURES:
        np.testing.assert_array_equal(a[f], b[f][:450], err_msg=f)


class _Recorder:
    """학습에 들어온 행의 날짜를 기록한다 — 모델은 상수."""

    name = "recorder"

    def __init__(self, rows: Rows) -> None:
        self.rows = rows
        self.seen: list[np.ndarray] = []

    def fit(self, x: np.ndarray, y: np.ndarray) -> "_Const":
        # x 의 첫 열에 행 번호를 심어 두었다
        self.seen.append(self.rows.dates[x[:, 0].astype(int)])
        return _Const(float(y.mean()))


class _Const:
    def __init__(self, p: float) -> None:
        self.p = p

    def predict(self, x: np.ndarray) -> np.ndarray:
        return np.full(x.shape[0], self.p)


def test_walk_forward_trains_only_on_finished_labels(monkeypatch: object) -> None:
    n_weeks, per = 200, 5
    dates = np.repeat(np.arange(n_weeks, dtype=np.int64) * 7 * DAY, per)
    idx = np.arange(dates.size, dtype=np.float64)
    rng = np.random.default_rng(0)
    y = (rng.random(dates.size) < 0.3).astype(np.float64)
    rows = Rows(idx[:, None], y, dates, np.tile(np.arange(per), n_weeks), idx)
    rec = _Recorder(rows)
    wf = walk_forward(rows, rec)
    assert wf.retrains == len(rec.seen) > 0
    grid = np.unique(dates)
    starts = [int(grid[i]) for i in range(0, grid.size, mm.RETRAIN_EVERY)][-len(rec.seen) :]
    for a, seen in zip(starts, rec.seen, strict=True):
        assert seen.max() + mm.HORIZON * DAY <= a  # 라벨 끝 ≤ 재학습 시점
    # 보정된 행의 예측은 보정 풀(라벨 끝난 과거 OOS)이 있을 때만
    assert np.all(np.isnan(wf.p_cal) | ~np.isnan(wf.p_raw))

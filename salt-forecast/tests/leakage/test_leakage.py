"""누수 테스트 4종 — time-and-leakage.md §6. validate 에서 따로 한 번 더 돈다."""

from __future__ import annotations

import numpy as np

from salt_forecast.domain.scoring import choose_threshold
from salt_forecast.domain.series import DAY, CloseSeries
from salt_forecast.models.engine import POOL_WEEKS, WalkForward
from tests.synthetic import universe

DAYS = 900


def _snapshot(wf: WalkForward, as_of: int) -> list[tuple[str, int, str, tuple[float, ...], str]]:
    return sorted(
        (e.symbol, e.horizon_weeks, e.model_version, e.forecast.q, e.direction)
        for e in wf.emit(as_of, with_realized=False)
    )


def test_future_contamination_does_not_change_forecast() -> None:
    """as_of 이후 데이터를 바꿔도 as_of 의 전망이 같아야 한다."""
    base = universe(40, DAYS)
    as_of = int(next(iter(base.values())).available_at[600])
    tampered: dict[str, CloseSeries] = {}
    for s, c in base.items():
        close = c.close.copy()
        close[c.available_at > as_of] *= 3.0  # 미래를 폭등시킨다
        tampered[s] = CloseSeries(s, c.available_at, close)
    a = _snapshot(WalkForward(base), as_of)
    b = _snapshot(WalkForward(tampered), as_of)
    assert a and a == b


def test_reproducible() -> None:
    u = universe(20, DAYS)
    as_of = int(next(iter(u.values())).available_at[700])
    assert _snapshot(WalkForward(u), as_of) == _snapshot(WalkForward(u), as_of)


def test_embargo_pool_labels_end_before_as_of() -> None:
    u = universe(10, DAYS)
    wf = WalkForward(u)
    as_of = wf.grid[-10]
    for h in wf.horizons:
        idx = wf._pool_indices(as_of, h)  # pyright: ignore[reportPrivateUsage]
        assert len(idx) <= POOL_WEEKS
        assert all(wf.grid[i] + h * 7 * DAY <= as_of for i in idx)


def test_shuffled_labels_give_coin_flip_direction() -> None:
    """라벨을 섞으면 선택적 방향 판정도 동전이어야 한다. 넘으면 누수."""
    rng = np.random.default_rng(11)
    p_up = rng.uniform(0.2, 0.8, 20_000)
    realized = rng.permutation(np.where(rng.uniform(0, 1, 20_000) < p_up, 1.0, -1.0))
    t = choose_threshold(p_up[:10_000], realized[:10_000])
    assert t is not None
    test_p, test_r = p_up[10_000:], realized[10_000:]
    calls = (test_p >= t) | (test_p <= 1 - t)
    hits = ((test_r > 0) & (test_p >= t)) | ((test_r < 0) & (test_p <= 1 - t))
    rate = hits.sum() / calls.sum()
    assert abs(rate - 0.5) < 0.03

"""등락 분해 β · σ — 미래 오염 테스트(time-and-leakage.md §6). as_of 뒤 봉을 더해도 as_of 로 자른 결과가 같아야 한다."""

from __future__ import annotations

import numpy as np

from salt_forecast.domain.move_beta import MoveBetaWindow, kr_move_beta
from salt_forecast.domain.series import DAY, CloseSeries

T0 = 1_700_000_000


def _series(symbol: str, rets: np.ndarray) -> CloseSeries:
    t = T0 + DAY * np.arange(rets.size + 1, dtype=np.int64)
    return CloseSeries(symbol, t, 100.0 * np.exp(np.concatenate([[0.0], np.cumsum(rets)])))


def test_future_bars_do_not_change_as_of_result() -> None:
    rng = np.random.default_rng(3)
    rm = rng.normal(0, 0.01, 400)
    rsec = rm + rng.normal(0, 0.01, 400)
    rs = 1.1 * rm + 0.4 * (rsec - rm) + rng.normal(0, 0.003, 400)
    w = MoveBetaWindow()
    as_of = T0 + DAY * 250
    past = [_series(s, r[:250]) for s, r in (("A", rs), ("0001", rm), ("0027", rsec))]
    # 미래 150일은 완전히 다른 관계(β 3) — 섞이면 β 가 바뀐다
    future_rs = np.concatenate([rs[:250], 3.0 * rm[250:]])
    full = [_series(s, r) for s, r in (("A", future_rs), ("0001", rm), ("0027", rsec))]
    a = kr_move_beta(past[0].as_of(as_of), past[1].as_of(as_of), past[2].as_of(as_of), w)
    b = kr_move_beta(full[0].as_of(as_of), full[1].as_of(as_of), full[2].as_of(as_of), w)
    assert a == b

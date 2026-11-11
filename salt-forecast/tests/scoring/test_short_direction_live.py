"""라이브 예측(short-direction@1 [decision] live).

마지막 격자 행 · 유니버스 안 종목만 · 분위 순서 · 무효선 = 기준 × exp(q10).
"""

from __future__ import annotations

import math

import numpy as np

from salt_forecast.domain.panel import forward_log_return
from salt_forecast.domain.short_direction import cell_rows, crypto_cell_panel, walk_forward
from salt_forecast.scoring.short_direction import live_predictions
from tests.domain.test_short_direction import SPEC, hourly_panel


def test_live_predictions_last_row_universe_only() -> None:
    p = hourly_panel(24 * 120, 60)
    cp = crypto_cell_panel(p)
    day = ((p.dates - 1) // 86_400).astype(np.int64)
    rows = cell_rows(cp, 1, forward_log_return(p, 1), 0.0015, day)
    wf = walk_forward(rows, SPEC, p.dates.size - 1)
    assert wf.last_fit is not None
    zq = {"low": (-1.3, -0.1, 1.1), "mid": (-1.2, 0.0, 1.2), "high": (-1.1, 0.1, 1.3)}
    out = live_predictions(cp, "crypto", "1h", 1, wf.last_fit, zq)
    last = p.dates.size - 1
    in_universe = {p.symbols[j] for j in np.flatnonzero(cp.universe[last])}
    assert out and {x.symbol for x in out} <= in_universe
    for x in out:
        assert x.q10 <= x.q50 <= x.q90
        assert 0.0 <= x.p_up <= 1.0
        assert math.isclose(x.invalidation, x.ref_price * math.exp(x.q10))
        assert int(x.as_of.timestamp()) == int(p.dates[last])


def test_live_predictions_skip_missing_quantile_bin() -> None:
    p = hourly_panel(24 * 120, 60)
    cp = crypto_cell_panel(p)
    day = ((p.dates - 1) // 86_400).astype(np.int64)
    rows = cell_rows(cp, 1, forward_log_return(p, 1), 0.0015, day)
    wf = walk_forward(rows, SPEC, p.dates.size - 1)
    assert wf.last_fit is not None
    assert live_predictions(cp, "crypto", "1h", 1, wf.last_fit, {}) == []  # 분위 없으면 지어내지 않는다

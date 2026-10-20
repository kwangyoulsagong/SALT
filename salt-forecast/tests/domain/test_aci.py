"""ACI 보정 도구(사전등록 `kr-scale@2`) — 명목 덮어쓰기 · 이탈률 · 한 걸음."""

from __future__ import annotations

import numpy as np

from salt_forecast.domain.calibration import (
    ACI_ALPHA_MAX,
    ACI_ALPHA_MIN,
    INTERVALS,
    NOMINAL_ALPHA,
    ResidualPool,
    aci_step,
    apply,
    fit_adjustments,
    miss_rates,
)
from salt_forecast.domain.quantiles import Z_SCORES, QuantileForecast


def _pool(m: int, seed: int = 3) -> ResidualPool:
    rng = np.random.default_rng(seed)
    scale = rng.uniform(0.02, 0.06, m)
    return ResidualPool(Z_SCORES[None, :] * scale[:, None], scale, rng.standard_t(4, m) * scale)


def test_nominal_coverages_equal_default() -> None:
    pool = _pool(400)
    default = fit_adjustments(pool)
    nominal = fit_adjustments(pool, tuple(1.0 - a for a in NOMINAL_ALPHA))
    assert default is not None and nominal is not None
    assert np.allclose(default.by_interval, nominal.by_interval)


def test_lower_alpha_widens() -> None:
    pool = _pool(400)
    base = fit_adjustments(pool)
    wide = fit_adjustments(pool, tuple(cov + 0.05 for _, _, cov in INTERVALS))
    assert base is not None and wide is not None
    assert all(w >= b for w, b in zip(wide.by_interval, base.by_interval, strict=True))


def test_miss_rates_match_apply() -> None:
    pool, test = _pool(400), _pool(300, seed=9)
    adj = fit_adjustments(pool)
    assert adj is not None
    got = miss_rates(test.raw_q, test.scale, test.realized, adj)
    for k, (lo, hi, _) in enumerate(INTERVALS):
        misses: list[bool] = []
        for q, s, r in zip(test.raw_q, test.scale, test.realized, strict=True):
            fc = apply(QuantileForecast.from_array(q, 0.5), float(s), adj)
            misses.append(r < fc.at(lo) or r > fc.at(hi))
        assert got[k] == np.mean(misses)


def test_aci_step_direction_and_clip() -> None:
    over = aci_step(NOMINAL_ALPHA, (0.3, 0.4, 0.7), 0.05)  # 너무 많이 빗나감 → α 줄여 넓힌다
    assert all(a < n for a, n in zip(over[:2], NOMINAL_ALPHA[:2], strict=True))
    under = aci_step(NOMINAL_ALPHA, (0.0, 0.0, 0.0), 0.05)  # 안 빗나감 → α 키워 좁힌다
    assert under[0] > NOMINAL_ALPHA[0] and under[2] == ACI_ALPHA_MAX
    floor = aci_step((ACI_ALPHA_MIN,) * 3, (1.0, 1.0, 1.0), 0.05)
    assert floor == (ACI_ALPHA_MIN,) * 3

"""dvol-sigma@1 — t 의 σ 후보는 t 이후 수익률 · DVOL 을 바꿔도 같아야 한다(time-and-leakage.md §6 미래 오염)."""

import numpy as np

from salt_forecast.domain import dvol_sigma as d


def test_scale_and_candidates_ignore_future() -> None:
    rng = np.random.default_rng(3)
    n = 900
    r = np.concatenate(([np.nan], rng.normal(0, 0.03, n - 1)))
    dv = rng.uniform(40, 90, n)
    ewma = rng.uniform(0.3, 0.8, n)
    t = 700
    base = d.candidates(ewma, dv, d.dvol_scale(r, dv))
    r2, dv2 = r.copy(), dv.copy()
    r2[t + 1 :] *= 5.0
    dv2[t + 1 :] = 999.0
    after = d.candidates(ewma, dv2, d.dvol_scale(r2, dv2))
    for name in ("dvol_scaled", "blend", "raw_dvol"):
        a, b = getattr(base, name)[: t + 1], getattr(after, name)[: t + 1]
        assert np.array_equal(a, b, equal_nan=True), name

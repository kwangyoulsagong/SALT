import numpy as np
import pytest
from hypothesis import given
from hypothesis import strategies as st

from salt_forecast.domain.quantiles import LEVELS, QuantileForecast, crossings, pinball

floats = st.floats(min_value=-2, max_value=2, allow_nan=False)


@given(st.lists(floats, min_size=7, max_size=7), st.floats(min_value=-1, max_value=2))
def test_from_array_is_monotone_and_p_up_clipped(values: list[float], p: float) -> None:
    fc = QuantileForecast.from_array(np.asarray(values), p)
    assert all(a <= b for a, b in zip(fc.q, fc.q[1:], strict=False))
    assert 0.0 <= fc.p_up <= 1.0


@given(st.lists(floats, min_size=7, max_size=7), floats)
def test_pinball_non_negative(values: list[float], y: float) -> None:
    assert pinball(QuantileForecast.from_array(np.asarray(values), 0.5), y) >= 0


def test_rejects_crossing() -> None:
    with pytest.raises(ValueError):
        QuantileForecast(q=(0.1, 0.0, 0.2, 0.3, 0.4, 0.5, 0.6), p_up=0.5)


def test_crossings_counted() -> None:
    assert crossings(np.asarray([0.0, -0.1, 0.2, 0.1, 0.3, 0.4, 0.5])) == 2


def test_pinball_minimized_by_true_quantiles() -> None:
    rng = np.random.default_rng(0)
    y = rng.normal(0, 1, 20_000)
    true_q = np.quantile(y, LEVELS)
    good = QuantileForecast.from_array(true_q, 0.5)
    bad = QuantileForecast.from_array(true_q * 1.5, 0.5)
    assert np.mean([pinball(good, v) for v in y[:5000]]) < np.mean([pinball(bad, v) for v in y[:5000]])

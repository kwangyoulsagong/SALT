"""실현 변동성 — 미래 오염 · 재현 (time-and-leakage.md §6). as_of 뒤 봉을 바꿔도 같은 as_of 값은 같다."""

from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.series import DAY, CloseSeries
from salt_forecast.domain.volatility import estimate

T0 = int(datetime(2022, 1, 1, tzinfo=UTC).timestamp())


def _series(close: np.ndarray) -> CloseSeries:
    t = (T0 + np.arange(1, close.size + 1, dtype=np.int64) * DAY).astype(np.int64)
    return CloseSeries("KRW-BTC", t, close)


def test_future_bars_do_not_change_estimate() -> None:
    rng = np.random.default_rng(11)
    full = 100 * np.exp(np.cumsum(rng.normal(0, 0.04, 1200)))
    as_of = datetime.fromtimestamp(T0 + 900 * DAY, UTC)
    base = estimate(_series(full[:900]), as_of)
    tampered = full.copy()
    tampered[900:] *= np.exp(rng.normal(0, 0.5, 300))  # as_of 뒤 봉만 크게 흔든다
    assert estimate(_series(tampered), as_of) == base
    assert base.garch is not None  # GARCH 경로까지 탔는지


def test_same_input_same_output() -> None:
    rng = np.random.default_rng(12)
    s = _series(100 * np.exp(np.cumsum(rng.normal(0, 0.04, 900))))
    as_of = datetime.fromtimestamp(T0 + 901 * DAY, UTC)
    assert estimate(s, as_of) == estimate(s, as_of)

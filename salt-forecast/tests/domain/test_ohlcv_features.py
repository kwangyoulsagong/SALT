import numpy as np

from salt_forecast.domain.features import garman_klass_var, ohlcv_features
from salt_forecast.domain.series import DAY, OhlcvSeries


def _bars(n: int, value: float = 1000.0) -> OhlcvSeries:
    t = np.arange(1, n + 1, dtype=np.int64) * DAY
    c = np.full(n, 100.0)
    return OhlcvSeries("X", t, c.copy(), c * 1.02, c * 0.98, c.copy(), np.full(n, value))


def test_gk_zero_when_no_range() -> None:
    one = np.ones(3)
    assert np.allclose(garman_klass_var(one, one, one, one), 0.0)


def test_gk_known_value() -> None:
    v = garman_klass_var(np.array([100.0]), np.array([102.0]), np.array([98.0]), np.array([100.0]))
    assert abs(v[0] - 0.5 * np.log(102 / 98) ** 2) < 1e-15


def test_volume_change_detects_surge() -> None:
    b = _bars(40)
    vol = b.volume.copy()
    vol[-7:] *= np.e  # 최근 1주 거래량 e 배
    s = OhlcvSeries("X", b.available_at, b.open, b.high, b.low, b.close, vol)
    f = ohlcv_features(s, int(s.available_at[-1]))
    assert abs(f["value_chg_1w_3w"] - 1.0) < 1e-9
    assert abs(f["gk_ratio_1w_4w"] - 1.0) < 1e-9


def test_missing_volume_is_nan_not_zero() -> None:
    b = _bars(40)
    s = OhlcvSeries("X", b.available_at, b.open, b.high, b.low, b.close, np.full(40, np.nan))
    f = ohlcv_features(s, int(s.available_at[-1]))
    assert np.isnan(f["value_log_1w"]) and np.isnan(f["value_chg_1w_3w"])

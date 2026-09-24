from itertools import pairwise

import numpy as np
import pytest

from salt_forecast.domain.calendar import weekly_grid
from salt_forecast.domain.series import DAY, WEEK, CloseSeries, realized_log_return


def _s() -> CloseSeries:
    t = np.arange(1, 40, dtype=np.int64) * DAY
    return CloseSeries("X", t, np.linspace(100, 138, t.size))


def test_as_of_cuts_future() -> None:
    s = _s().as_of(10 * DAY)
    assert s.last_at() == 10 * DAY


def test_realized_none_until_period_ends() -> None:
    s = _s()
    assert realized_log_return(s, 30 * DAY, 2) is None
    r = realized_log_return(s, 10 * DAY, 1)
    end, start = s.close_at_or_before(17 * DAY), s.close_at_or_before(10 * DAY)
    assert r is not None and end is not None and start is not None
    assert abs(r - float(np.log(end / start))) < 1e-12


def test_rejects_non_increasing_time() -> None:
    with pytest.raises(ValueError):
        CloseSeries("X", np.asarray([1, 1], dtype=np.int64), np.asarray([1.0, 2.0]))


def test_weekly_grid_is_mondays() -> None:
    grid = weekly_grid(0, 60 * DAY)
    assert all((g // DAY - 4) % 7 == 0 for g in grid)  # 1970-01-05 월요일 기준
    assert all(b - a == WEEK for a, b in pairwise(grid))


def test_blank_fred_key_is_none() -> None:
    from salt_forecast.config import Settings

    s = Settings(database_url="postgresql://x", fred_api_key="  ")  # pyright: ignore[reportCallIssue,reportArgumentType]
    assert s.fred_api_key is None

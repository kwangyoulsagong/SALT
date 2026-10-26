"""국내 국면 구간 — 날짜 경계(FC-REQ-020 FR-14)."""

from __future__ import annotations

from datetime import date

import pytest

from salt_forecast.domain.calendar import krx_session
from salt_forecast.domain.kr_regime import HIGH_VOL_2026, NORMAL, SHORT_BAN, kr_regime


@pytest.mark.parametrize(
    ("d", "want"),
    [
        (date(2023, 11, 3), NORMAL),  # 금지 직전 금요일
        (date(2023, 11, 6), SHORT_BAN),  # 금지 첫날
        (date(2025, 3, 28), SHORT_BAN),  # 금지 마지막 거래일
        (date(2025, 3, 31), NORMAL),  # 재개일
        (date(2025, 12, 29), NORMAL),
        (date(2026, 1, 2), HIGH_VOL_2026),
        (date(2026, 7, 13), HIGH_VOL_2026),
    ],
)
def test_regime_by_as_of_date(d: date, want: str) -> None:
    assert kr_regime(krx_session(d)) == want

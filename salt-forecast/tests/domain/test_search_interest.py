"""검색 관심 이어 붙이기 · 신호(FC-REQ-017). 배율이 약분되는지가 핵심이다."""

from __future__ import annotations

import math
from datetime import date, timedelta

from salt_forecast.domain.search_interest import chain_link, fill_days, spike

D0 = date(2026, 1, 1)


def _days(n: int, f: float = 1.0, start: date = D0) -> dict[date, float]:
    return {start + timedelta(days=i): (10 + (i % 7)) * f for i in range(n)}


def test_chain_link_rescales_new_days_to_stored_scale() -> None:
    stored = _days(60)  # 기준 배율
    fresh = _days(70, f=0.5)  # 같은 세상을 절반 배율로 받았다 + 새 10일
    new = chain_link(stored, fresh)
    assert new is not None
    assert sorted(new) == [D0 + timedelta(days=i) for i in range(60, 70)]
    assert all(abs(new[d] - _days(70)[d]) < 1e-9 for d in new)


def test_chain_link_refuses_short_or_noisy_overlap() -> None:
    assert chain_link(_days(20), _days(30, 0.5)) is None
    noisy = {d: v * (0.3 if i % 2 else 1.0) for i, (d, v) in enumerate(_days(70).items())}
    assert chain_link(_days(60), noisy) is None


def test_spike_is_scale_invariant() -> None:
    s = _days(40)
    last = D0 + timedelta(days=39)
    a, b = spike(s, last), spike({d: v * 37 for d, v in s.items()}, last)
    assert a is not None and b is not None and math.isclose(a, b)


def test_spike_uses_only_days_up_to_last_and_needs_full_window() -> None:
    s = _days(40)
    last = D0 + timedelta(days=34)
    with_future = {**s, last + timedelta(days=1): 10_000.0}
    assert spike(s, last) == spike(with_future, last)
    assert spike(s, D0 + timedelta(days=30)) is None  # 35일이 안 된다


def test_spike_missing_when_base_near_zero() -> None:
    s = {D0 + timedelta(days=i): 0.1 for i in range(35)}
    assert spike(s, D0 + timedelta(days=34)) is None


def test_fill_days_zero_fills_inside_request_only() -> None:
    got = fill_days({D0: 5.0}, D0, D0 + timedelta(days=2))
    assert got == {D0: 5.0, D0 + timedelta(days=1): 0.0, D0 + timedelta(days=2): 0.0}

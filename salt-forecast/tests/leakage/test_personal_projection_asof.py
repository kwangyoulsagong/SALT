"""개인 재무 채점 · 물가 — as_of 뒤에 생긴 일을 쓰지 않는다(FC-REQ-024 수용 기준 3 · time-and-leakage.md §6 미래 오염).

같은 발행 · 같은 as_of 에 나중 사실(도달 · 보관 · 가계부 판정)을 더해도 그 as_of 의 판정은 같다.
물가는 발표 전 달을 내보내지 않는다 — 무작위 as_of 에서 available_at > as_of 행 0.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

import numpy as np

from salt_forecast.domain.personal_projection import (
    LandingState,
    SavingsState,
    landing_issuance,
    savings_issuance,
    verdicts,
)
from salt_forecast.ingest.ecos import IndexMonth, to_points

KST = ZoneInfo("Asia/Seoul")


def test_future_outcomes_do_not_change_past_verdicts() -> None:
    issued = datetime(2026, 1, 10, tzinfo=UTC)
    s = savings_issuance(
        "s1", "h", "g", issued, "empirical_quantile", date(2026, 6, 1), date(2026, 9, 1), None, 4, False
    )
    ls = landing_issuance("l1", "h", date(2026, 1, 1), issued, "empirical_window", None, 30, 22)
    as_of = date(2026, 5, 31)
    before = verdicts(
        [s, ls], {"s1": SavingsState(None, None)}, {"l1": LandingState(date(2026, 2, 8), "inside")}, as_of
    )
    # as_of 뒤: 6월 도달 · 가계부 판정이 바뀐 지금 값(지출을 늦게 고침)은 2월 8일 이전 as_of 엔 보이지 않는다
    after = verdicts(
        [s, ls],
        {"s1": SavingsState(date(2026, 6, 1), date(2026, 7, 1))},
        {"l1": LandingState(date(2026, 2, 8), "inside")},
        as_of,
    )
    assert before == after
    early = verdicts([ls], {}, {"l1": LandingState(date(2026, 2, 8), "above")}, date(2026, 2, 7))
    assert early == []


def test_cpi_points_never_from_the_future() -> None:
    rng = np.random.default_rng(7)
    months = [IndexMonth(date(2015 + i // 12, i % 12 + 1, 1), 90.0 + i * 0.1, "2020=100") for i in range(140)]
    releases = sorted(
        datetime(m.month.year + m.month.month // 12, m.month.month % 12 + 1, 3, 8, tzinfo=KST) for m in months[60:]
    )
    start = datetime(2015, 1, 1, tzinfo=UTC)
    for _ in range(1000):
        as_of = start + timedelta(days=int(rng.integers(0, 140 * 31)))
        pts = to_points(months, releases, as_of)
        assert all(p.available_at <= as_of for p in pts)
        # 그 달이 끝나기 전에 그 달 값이 나오지 않는다
        assert all(p.available_at > p.observed_at + timedelta(days=27) for p in pts)

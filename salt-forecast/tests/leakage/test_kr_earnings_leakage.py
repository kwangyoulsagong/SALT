"""누수 — 예상 창 · 확정 일정은 as_of 뒤에 게시된 공시를 보지 않는다(time-and-leakage.md §6 미래 오염)."""

from __future__ import annotations

import random
from datetime import UTC, date, datetime, timedelta

from salt_forecast.domain.kr_earnings import EarningsFiling, confirmed_schedules, earnings_events, window


def _pub(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, 14, 59, 59, tzinfo=UTC)


def _filings(rng: random.Random) -> list[EarningsFiling]:
    out: list[EarningsFiling] = []
    for y in range(2016, 2027):
        for m, last in ((3, 31), (6, 30), (9, 30), (12, 31)):
            d = date(y, m, last) + timedelta(days=rng.randint(20, 85 if m == 12 else 44))
            out.append(
                EarningsFiling(
                    f"{y}{m}",
                    "000660",
                    "earnings",
                    "영업(잠정)실적(공정공시)",
                    d,
                    _pub(d),
                    None,
                    None,
                    None,
                    None,
                    False,
                )
            )
            ir = d - timedelta(days=rng.randint(1, 10))
            out.append(
                EarningsFiling(
                    f"ir{y}{m}",
                    "000660",
                    "ir",
                    "기업설명회(IR)개최(안내공시)",
                    ir - timedelta(days=12),
                    _pub(ir - timedelta(days=12)),
                    None,
                    datetime(ir.year, ir.month, ir.day, 7, tzinfo=UTC),
                    True,
                    True,
                    True,
                )
            )
    return out


def test_future_filings_do_not_change_window() -> None:
    rng = random.Random(7)
    full = _filings(rng)
    for _ in range(300):
        as_of = datetime(2018, 1, 1, tzinfo=UTC) + timedelta(days=rng.randint(0, 3200))
        past = [f for f in full if f.published_at <= as_of]
        a = window("000660", as_of, earnings_events(full), confirmed_schedules(full), 12)
        b = window("000660", as_of, earnings_events(past), confirmed_schedules(past), 12)
        assert a == b, as_of

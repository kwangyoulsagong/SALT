"""사건 반응 창 · 선반영 삼분위 — event-window@1 [protocol] 경계."""

from __future__ import annotations

from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.event_window import (
    EventRow,
    describe,
    market_minute_move,
    minute_move,
    pick_events,
    tercile_cuts,
    tercile_of,
    windows,
)
from salt_forecast.domain.news_reaction import Aligned, Title
from salt_forecast.domain.series import OhlcvSeries

DAY = 86_400
T0 = int(datetime(2025, 1, 1, 7, tzinfo=UTC).timestamp())


def aligned(sym: str, closes: list[float], market: list[float] | None = None) -> Aligned:
    c = np.asarray(closes, dtype=np.float64)
    m = np.asarray(market if market is not None else [100.0] * len(closes), dtype=np.float64)
    return Aligned(sym, T0 + DAY * np.arange(c.size, dtype=np.int64), c, m, None)


def at(day: float) -> datetime:
    return datetime.fromtimestamp(T0 + int(day * DAY), tz=UTC)


def test_pick_events_cooldown_and_earliest_title_per_ref() -> None:
    a = {"A": aligned("A", [100.0] * 40)}
    titles = [
        Title("news", "earnings", "A", at(10.5)),  # 기준 봉 10
        Title("news", "earnings", "A", at(10.2)),  # 같은 기준 봉 — 더 이른 게시가 그 사건
        Title("news", "earnings", "A", at(13.5)),  # 3봉 뒤 — 쿨다운으로 빠짐
        Title("news", "earnings", "A", at(16.5)),  # 6봉 뒤 — 사건
        Title("news", "other", "A", at(20.5)),  # other 는 사건 아님
    ]
    picked = pick_events(titles, a)
    assert [(ref, t.published_at) for t, ref in picked] == [(10, at(10.2)), (16, at(16.5))]


def test_windows_are_excess_over_market_and_closed_by_as_of() -> None:
    closes = [100.0] * 30
    closes[10:] = [110.0] * 20  # 기준 봉 10 에서 이미 +10%
    closes[11:] = [121.0] * 19  # 다음 봉 +10%
    market = [100.0] * 11 + [105.0] * 19  # 시장은 다음 봉 +5%
    a = {"A": aligned("A", closes, market)}
    picked = [(Title("news", "earnings", "A", at(10.5)), 10)]
    row = windows(picked, a, {}, T0 + 29 * DAY)[0]
    assert np.isclose(row.pre5, np.log(1.1))
    assert np.isclose(row.post1, np.log(1.1) - np.log(1.05))
    # as_of 가 +5 봉 전이면 post5 는 없다(누수 — 닫히지 않은 창)
    early = windows(picked, a, {}, T0 + 12 * DAY)[0]
    assert np.isfinite(early.post1) and np.isnan(early.post5)


def test_minute_move_and_market_adjustment() -> None:
    pub = T0 + 1_000  # 봉 경계가 아닌 시각
    start_bar = (pub // 300 + 1) * 300  # 게시 뒤 첫 봉 시작
    t = start_bar + 300 * np.arange(1, 13, dtype=np.int64)  # 마감 시각들
    px = 100.0 * np.exp(0.01 * np.arange(12))
    m = OhlcvSeries("A", t, px / np.exp(0.01), px, px, px, np.ones(12))
    x = minute_move(m, pub, pub + 1800)
    assert np.isfinite(x) and x > 0
    flat = OhlcvSeries("B", t, np.full(12, 50.0), np.full(12, 50.0), np.full(12, 50.0), np.full(12, 50.0), np.ones(12))
    assert np.isclose(market_minute_move({"B": flat}, pub, pub + 1800), 0.0)
    assert np.isnan(minute_move(m, pub + 10 * DAY, pub + 10 * DAY + 1800))  # 봉 없음


def test_tercile_cuts_and_assignment() -> None:
    rows = [EventRow("news", "k", "A", i, T0 + i * DAY, T0, 0, float(i), 0, 0, 0, 0) for i in range(9)]
    cuts = tercile_cuts(rows)
    assert cuts is not None
    assert [tercile_of(float(i), cuts) for i in range(9)] == ["low"] * 3 + ["mid"] * 3 + ["high"] * 3
    assert tercile_of(float("nan"), cuts) is None


def test_describe_below_min_until_enough_days_then_ok() -> None:
    rng = np.random.default_rng(0)
    rows = [
        EventRow("news", "k", f"S{i % 7}", i, T0 + i * DAY, T0 + i * DAY, 0, float(rng.normal()), 0, float("nan"),
                 float(rng.normal()), float(rng.normal()))
        for i in range(600)
    ]  # fmt: skip
    tagged, stats = describe("kr", rows)
    assert all(r.tercile in ("low", "mid", "high") for r in tagged)
    alls = [s for s in stats if s.tercile == "all"]
    assert {s.horizon for s in alls} == {1, 5} and all(s.status == "ok" for s in alls)
    low = next(s for s in stats if s.tercile == "low" and s.horizon == 1)
    assert low.status == "ok" and low.base_up_rate is not None and low.p_holm is not None
    few, few_stats = describe("kr", rows[:12])
    assert all(s.status == "below_min" for s in few_stats) and len(few) == 12


def test_future_titles_do_not_change_past_rows() -> None:
    a = {"A": aligned("A", list(np.linspace(100, 130, 60)))}
    past = [Title("news", "earnings", "A", at(d + 0.5)) for d in (10, 20, 30)]
    future = [*past, Title("news", "earnings", "A", at(45.5))]
    as_of = T0 + 40 * DAY
    p_rows = windows(pick_events([t for t in past if t.published_at.timestamp() <= as_of], a), a, {}, as_of)
    f_rows = windows(pick_events([t for t in future if t.published_at.timestamp() <= as_of], a), a, {}, as_of)
    assert repr(p_rows) == repr(f_rows)  # NaN 칸이 있어 == 대신 repr
    assert all(r.published <= as_of for r in f_rows)


def test_dart_published_backfill_uses_receipt_day_end_kst() -> None:
    from datetime import date

    from salt_forecast.store.event_window import dart_published

    backfilled = dart_published(datetime(2026, 11, 14, 3, tzinfo=UTC), date(2025, 12, 1))
    assert backfilled == datetime(2025, 12, 1, 14, 59, 59, tzinfo=UTC)  # 23:59:59 KST
    live = datetime(2026, 11, 16, 6, 30, tzinfo=UTC)  # 15:30 KST 같은 날 처음 봄
    assert dart_published(live, date(2026, 11, 16)) == live

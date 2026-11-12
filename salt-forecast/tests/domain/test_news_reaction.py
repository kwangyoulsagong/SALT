"""소식 반응 — news-reaction@1 [protocol] 경계."""

from __future__ import annotations

from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.news_reaction import (
    Aligned,
    Title,
    align,
    baseline_up_rate,
    crypto_index,
    describe,
    events,
    excess,
    recent_pre_moves,
)
from salt_forecast.domain.series import OhlcvSeries

DAY = 86_400
T0 = int(datetime(2025, 1, 1, 7, tzinfo=UTC).timestamp())  # 16:00 KST


def series(sym: str, closes: list[float], t0: int = T0) -> OhlcvSeries:
    c = np.asarray(closes, dtype=np.float64)
    t = t0 + DAY * np.arange(c.size, dtype=np.int64)
    return OhlcvSeries(sym, t, c, c, c, c, np.ones(c.size))


def flat_market(n: int) -> OhlcvSeries:
    return series("M", [100.0] * n)


def at(i: int, hours: float = 1.0) -> datetime:
    """봉 i 마감 뒤 hours 시간 — 기준 봉이 i."""
    return datetime.fromtimestamp(T0 + i * DAY + int(hours * 3600), UTC)


def test_초과는_시장_몫을_뺀다() -> None:
    a = align(series("A", [100, 110]), series("M", [100, 110]), kr_breaks=False)
    assert abs(float(excess(a, np.array([0]), np.array([1]))[0])) < 1e-12


def test_시장_봉이_없으면_그_창은_없다() -> None:
    one = np.array([100.0])
    m = OhlcvSeries("M", np.array([T0], dtype=np.int64), one, one, one, one, np.array([1.0]))
    a = align(series("A", [100, 110]), m, kr_breaks=False)
    assert np.isnan(excess(a, np.array([0]), np.array([1]))[0])


def test_국내_끊김을_걸친_창은_없다() -> None:
    a = align(series("A", [100, 100, 150, 150]), flat_market(4), kr_breaks=True)  # 1.5배 = 끊김
    assert np.isnan(excess(a, np.array([0]), np.array([2]))[0])
    assert np.isfinite(excess(a, np.array([2]), np.array([3]))[0])


def test_기준_봉은_게시_전에_닫힌_마지막_봉() -> None:
    a = {"A": align(series("A", [100] * 10), flat_market(10), kr_breaks=False)}
    # 봉 3 마감 1초 전 게시 → 기준은 봉 2
    t = Title("disclosure", "earnings", "A", datetime.fromtimestamp(T0 + 3 * DAY - 1, UTC))
    assert [e.ref for e in events([t], a)] == [2]
    t2 = Title("disclosure", "earnings", "A", datetime.fromtimestamp(T0 + 3 * DAY, UTC))
    assert [e.ref for e in events([t2], a)] == [3]


def test_같은_봉은_하나_5봉_안은_뺀다_other_는_사건_아님() -> None:
    a = {"A": align(series("A", [100] * 30), flat_market(30), kr_breaks=False)}
    ts = [
        Title("news", "contract", "A", at(2)),
        Title("news", "contract", "A", at(2, 3)),  # 같은 봉
        Title("news", "contract", "A", at(6)),  # 4봉 뒤 — 뺀다
        Title("news", "contract", "A", at(7)),  # 5봉 뒤 — 센다
        Title("disclosure", "contract", "A", at(3)),  # 출처가 다르면 따로
        Title("news", "other", "A", at(20)),
        Title("news", "contract", "Z", at(2)),  # 시계열 없음
    ]
    got = [(e.origin, e.ref) for e in events(ts, a)]
    assert got == [("disclosure", 3), ("news", 2), ("news", 7)]


def _many(up: bool, n_sym: int = 40, n_ev: int = 2) -> tuple[dict[str, Aligned], list[Title]]:
    """종목마다 평평하다가 사건 다음 봉에 ±5%. 사건은 서로 다른 날."""
    aligned: dict[str, Aligned] = {}
    titles: list[Title] = []
    n = 200
    for s in range(n_sym):
        closes = [100.0] * n
        evs = [10 + s * 3 + k * 60 for k in range(n_ev)]
        for e in evs:
            closes[e + 1 :] = [c * (1.05 if up else 0.95) for c in closes[e + 1 :]]
        sym = f"S{s}"
        aligned[sym] = align(series(sym, closes), flat_market(n), kr_breaks=False)
        titles += [Title("disclosure", "contract", sym, at(e)) for e in evs]
    return aligned, titles


def test_같은_종류가_늘_오르면_higher_평소_비율과_비교() -> None:
    aligned, titles = _many(up=True)
    as_of = T0 + 400 * DAY
    base = {h: baseline_up_rate(aligned, h, as_of) for h in (1, 5)}
    stats = describe("kr", events(titles, aligned), aligned, as_of, base)
    one = next(s for s in stats if s.horizon == 1)
    assert one.status == "ok" and one.sample == 80 and one.up_rate == 1.0
    assert one.differs == "higher"
    assert one.pre_move_median == 0.0


def test_표본이_적으면_below_min_숫자는_없다() -> None:
    aligned, titles = _many(up=False, n_sym=5)
    as_of = T0 + 400 * DAY
    stats = describe("kr", events(titles, aligned), aligned, as_of, {1: 0.4, 5: 0.4})
    assert all(s.status == "below_min" and s.up_rate is None and s.differs is None for s in stats)
    assert stats[0].sample == 10


def test_as_of_에_닫히지_않은_창은_세지_않는다() -> None:
    aligned, titles = _many(up=True)
    evs = events(titles, aligned)
    last_ref = max(e.ref for e in evs)
    as_of = T0 + last_ref * DAY  # 마지막 사건 기준 봉까지만 닫힘
    stats = describe("kr", evs, aligned, as_of, {1: 0.5, 5: 0.5})
    one = next(s for s in stats if s.horizon == 1)
    assert one.sample == len(evs) - 1


def test_코인_지수는_로그수익_평균을_누적한다() -> None:
    idx = crypto_index({"A": series("A", [100, 110]), "B": series("B", [100, 90])})
    expect = 1000 * np.exp((np.log(1.1) + np.log(0.9)) / 2)
    assert abs(idx.close[-1] - expect) < 1e-9


def test_선반영_봉마다_5봉_초과() -> None:
    a = align(series("A", [100, 100, 100, 100, 100, 100, 120]), flat_market(7), kr_breaks=False)
    rows = recent_pre_moves(a, T0 + 6 * DAY, keep=3)
    assert [round(r.pre_move_5d, 6) for r in rows] == [0.0, round(float(np.log(1.2)), 6)]

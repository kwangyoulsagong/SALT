"""base-rate@3 — 장중 5분봉 기저율. 격자 · 조건 칸 · 라벨 끊기 · 구간 경계 · 시점(누수)을 작은 합성 데이터로."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime, timedelta

import numpy as np

from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.scoring import base_rate_intraday as bri

KST = 9 * 3600
D0 = int(datetime(2026, 9, 1, tzinfo=UTC).timestamp())  # 화요일 00:00 UTC = 09:00 KST


def _kr_series(
    days: int, syms: int = 3, seed: int = 0, bump: Mapping[tuple[int, int, int], float] | None = None
) -> dict[str, OhlcvSeries]:
    """평일 장중 5분봉(09:05 ~ 15:30 마감 78칸). bump[(종목, 날, 칸)] = 그 칸 종가 배수."""
    rng = np.random.default_rng(seed)
    out: dict[str, OhlcvSeries] = {}
    for j in range(syms):
        t: list[int] = []
        o: list[float] = []
        c: list[float] = []
        v: list[float] = []
        price = 10_000.0
        d = 0
        n = 0
        while n < days:
            day0 = D0 + d * DAY
            d += 1
            if datetime.fromtimestamp(day0, tz=UTC).weekday() >= 5:
                continue
            for k in range(78):
                op = price
                price = price * float(np.exp(rng.normal(0, 0.002)))
                price *= (bump or {}).get((j, n, k), 1.0)
                t.append(day0 + (k + 1) * bri.BAR)
                o.append(op)
                c.append(price)
                v.append(1_000.0)
            n += 1
        ta = np.asarray(t, dtype=np.int64)
        ca = np.asarray(c)
        out[f"00000{j}"] = OhlcvSeries(f"00000{j}", ta, np.asarray(o), ca * 1.001, ca * 0.999, ca, np.asarray(v))
    return out


def _frame(series: Mapping[str, OhlcvSeries]) -> bri.Frame:
    first = min(int(s.available_at[0]) for s in series.values())
    last = max(int(s.available_at[-1]) for s in series.values())
    return bri.kr_frame(series, first, last, (first, last + 1))


def test_kr_frame_has_only_session_bars_and_first_row_is_0905() -> None:
    f = _frame(_kr_series(3))
    assert f.p.dates.size == 3 * 78
    assert int(f.minute[0]) == 9 * 60 + 5
    assert int(f.minute[77]) == 15 * 60 + 30


def test_kr_label_stops_at_close_and_last_bar_has_none() -> None:
    f = _frame(_kr_series(2))
    labels = bri.kr_labels(f)
    last_of_day0 = 77
    assert np.isnan(labels[1][last_of_day0]).all()  # 그날 마지막 칸 — 라벨 없음
    # 15:00 마감 칸(66) 의 4시간 라벨은 15:30(77) 에서 끊긴다 — 다음 날로 넘어가지 않는다
    expect = np.log(f.p.close[last_of_day0] / f.p.close[66])
    assert np.allclose(labels[4][66], expect)


def test_kr_k7_and_km4_rows() -> None:
    # 종목 0: 3번째 날(n=2) 09:05 ~ 09:30 사이에 +3% — K7(첫 30분 ≥ +2%) 성립
    s = _kr_series(25, bump={(0, 21, 2): 1.03})
    f = _frame(s)
    masks, universe = bri.kr_masks(f, {})
    k7_rows = np.flatnonzero(masks["K7"][:, 0])
    assert k7_rows.size == 1
    assert int(f.minute[k7_rows[0]]) == 9 * 60 + 30
    assert universe[k7_rows[0], 0]
    # 같은 시각 20거래일 평균이 모자란 앞쪽 날엔 대상이 아니다
    assert not universe[: 20 * 78].any()


def test_vi_maps_to_bar_containing_trigger_and_only_first_per_day() -> None:
    day = datetime(2026, 9, 1, tzinfo=UTC)
    vi = [
        ("000000", day + timedelta(minutes=12, seconds=30)),  # 09:12:30 KST → 09:10 봉 → 마감 09:15
        ("000000", day + timedelta(minutes=40)),  # 같은 날 두 번째 — 세지 않는다
        ("000000", day + timedelta(minutes=15)),  # 09:15:00 정각 → 09:15 봉 → 마감 09:20 (첫 발동 아님)
    ]
    closes = bri.first_vi_closes(vi)
    assert closes == {"000000": [int((day + timedelta(minutes=15)).timestamp())]}


def test_macro_event_row_is_one_hour_after_release() -> None:
    release = datetime(2026, 9, 11, 12, 30, tzinfo=UTC)  # 21:30 KST
    assert bri.macro_closes([release]) == [int((release + timedelta(hours=1)).timestamp())]


def test_same_time_mean_excludes_today_and_needs_full_window() -> None:
    days, slots = 25, 4
    minute = np.tile(np.arange(slots, dtype=np.int64), days)
    m = np.arange(days * slots, dtype=np.float64)[:, None]
    out = bri.same_time_mean(m, minute, 20)
    assert np.isnan(out[: 20 * slots]).all()
    i = 20 * slots + 1  # 21번째 날 · 칸 1
    prev = m[[k * slots + 1 for k in range(20)], 0]
    assert np.isclose(out[i, 0], prev.mean())
    m2 = m.copy()
    m2[i, 0] = 1e9  # 오늘 값은 평균에 안 들어간다
    assert np.isclose(bri.same_time_mean(m2, minute, 20)[i, 0], prev.mean())


def test_rank_groups_top10_large_bottom_two_thirds_small() -> None:
    size = np.arange(30, dtype=np.float64)[None, :]
    large, small = bri.rank_groups(size, np.ones_like(size, dtype=np.bool_))
    assert large[0, 20:].all() and not large[0, :20].any()
    assert small[0].sum() == 20 and small[0, :20].all()


def test_chunks_do_not_double_count_events() -> None:
    s = _kr_series(80, bump={(1, 40, 30): 1.05, (1, 70, 30): 0.95})
    first = datetime.fromtimestamp(int(min(o.available_at[0] for o in s.values())), tz=UTC)
    as_of = datetime.fromtimestamp(int(max(o.available_at[-1] for o in s.values())), tz=UTC)

    def load(lo: datetime, hi: datetime) -> dict[str, OhlcvSeries]:
        a, b = int(lo.timestamp()), int(hi.timestamp())
        out: dict[str, OhlcvSeries] = {}
        for k, o in s.items():
            keep = (o.available_at >= a) & (o.available_at <= b)
            out[k] = OhlcvSeries(
                k, o.available_at[keep], o.open[keep], o.high[keep], o.low[keep], o.close[keep], o.volume[keep]
            )
        return out

    run = bri.run_kr(load, first, as_of, [])
    km1 = next(r for r in run.stats if r.condition_id == "KM1" and r.horizon == 1)
    km2 = next(r for r in run.stats if r.condition_id == "KM2" and r.horizon == 1)
    assert km1.stat.sample == 1 and km2.stat.sample == 1  # 80거래일 = 구간 둘 — 사건은 한 번씩


def test_masks_do_not_change_when_future_bars_are_added() -> None:
    s = _kr_series(30)
    cut = int(s["000000"].available_at[25 * 78])
    past = {k: o.as_of(cut) for k, o in s.items()}
    f_all = _frame(s)
    f_past = _frame(past)
    m_all, _ = bri.kr_masks(f_all, {})
    m_past, _ = bri.kr_masks(f_past, {})
    n = f_past.p.dates.size
    for key in m_past:
        assert (m_all[key][:n] == m_past[key]).all(), key

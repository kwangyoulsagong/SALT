"""전진 시험 채점 경로 — H1 열린 예측 채점 · 판정 표본 / H3 사건 기록 · 채점 · 판정 표본 · 제목 거르기.

라벨이 닫히기 전에 기록한 것만 판정 표본이 되는지(제때 · 등록 뒤 · 라벨 있음)를 경계로 본다."""

from __future__ import annotations

import math
from datetime import UTC, datetime, timedelta

import numpy as np

from salt_forecast.domain.move_news import REGISTERED_AT as MN_REG
from salt_forecast.domain.news_kind import Dictionary
from salt_forecast.domain.series import DAY
from salt_forecast.domain.vol_range import REGISTERED_AT, VolPanel, prepare
from salt_forecast.jobs.vol_range import forward_rows
from salt_forecast.scoring.move_news import MarketData, forward_sample, new_events, score_events, title_times
from salt_forecast.scoring.vol_range import score_open
from salt_forecast.store.move_news import EventRow
from salt_forecast.store.news_reaction import RawTitle
from salt_forecast.store.vol_range import PredictionRow

T_REG = int(REGISTERED_AT.timestamp()) // DAY * DAY + DAY  # 등록 다음 날 00:00 UTC


def _ts(t: int) -> datetime:
    return datetime.fromtimestamp(t, UTC)


def _vol_prep(n: int = 10) -> tuple[VolPanel, object]:
    dates = (T_REG + DAY * np.arange(n, dtype=np.int64)).astype(np.int64)
    rv = np.full((n, 1), 1e-4)
    rv[3, 0] = np.nan  # 하루 빈 날
    ret = np.full((n, 1), 0.01)
    close = 100 * np.exp(np.cumsum(ret, axis=0))
    p = VolPanel("crypto", dates, ("KRW-A",), rv, ret, close, np.ones((n, 1), dtype=bool))
    return p, prepare(p)


def _pred(ref: int, h: int, recorded: int, sym: str = "KRW-A") -> PredictionRow:
    return PredictionRow("crypto", h, sym, _ts(ref), "mv", 1e-4, 1e-4, 1e-4, 1e-4, 0.01, 0.02, _ts(recorded))


def test_score_open_fills_closed_labels_and_in_time() -> None:
    p, prep = _vol_prep()
    d = p.dates
    rows = [
        _pred(int(d[0]), 1, int(d[0]) + 60),  # 제때 · 닫힘
        _pred(int(d[0]), 5, int(d[1]) + 1),  # 다음 봉 마감 뒤 기록 → 늦음
        _pred(int(d[8]), 5, int(d[8]) + 60),  # 아직 안 닫힘
        _pred(int(d[2]), 1, int(d[2]) + 60),  # 라벨 날(3) RV 없음 → NaN 으로 닫힘
        _pred(int(d[0]), 1, int(d[0]) + 60, "KRW-ZZ"),  # 패널에 없는 종목 → NaN 으로 닫힘
    ]
    out = score_open(prep, rows, _ts(int(d[-1])))  # pyright: ignore[reportArgumentType]
    by = {(r.ref_at, r.horizon, r.symbol): r for r in out}
    a = by[(_ts(int(d[0])), 1, "KRW-A")]
    assert a.in_time and math.isclose(a.realized_rv or 0, 1e-4) and math.isclose(a.realized_r or 0, 0.01)
    assert by[(_ts(int(d[0])), 5, "KRW-A")].in_time is False
    assert (_ts(int(d[8])), 5, "KRW-A") not in by
    assert math.isnan(by[(_ts(int(d[2])), 1, "KRW-A")].realized_rv or math.nan)
    assert math.isnan(by[(_ts(int(d[0])), 1, "KRW-ZZ")].realized_rv or math.nan)


def test_forward_rows_keep_registered_closed_with_replay_and_cutoff() -> None:
    p, prep = _vol_prep()
    d = p.dates
    before = int(REGISTERED_AT.timestamp()) - DAY
    rows = [_pred(int(d[0]), 1, int(d[0]) + 60), _pred(int(d[0]), 5, int(d[1]) + 1), _pred(before, 1, before + 60)]
    scored = score_open(prep, rows, _ts(int(d[-1])))  # pyright: ignore[reportArgumentType]
    # 등록 전 기준 봉은 패널 밖이라 채점도 안 된다 — 채점된 것처럼 꾸며도 표본에서 빠지는지
    fake = PredictionRow("crypto", 1, "KRW-A", _ts(before), "mv", 1e-4, 1e-4, 1e-4, 1e-4, 0.01, 0.02,
                         _ts(before + 60), 1e-4, 0.01, True, _ts(before + DAY))  # fmt: skip
    got = forward_rows([*scored, fake], "crypto", 1)
    assert [r.ref_at for r in got] == [int(d[0])]
    # @3 — 늦게 쓴 행(동결 재생)도 판정 표본, 실시간만(민감도)에서는 빠진다
    assert [r.ref_at for r in forward_rows(scored, "crypto", 5)] == [int(d[0])]
    assert forward_rows(scored, "crypto", 5, realtime_only=True) == []
    # 판정 날짜 표본 끝 — 그 시각 이후 기준 봉은 빠진다
    assert forward_rows([*scored, fake], "crypto", 1, cutoff=int(d[0])) == []


def _md(n: int = 12) -> MarketData:
    t0 = int(MN_REG.timestamp()) // DAY * DAY + DAY
    dates = (t0 + DAY * np.arange(n, dtype=np.int64)).astype(np.int64)
    shape = (n, 2)
    ev = np.zeros(shape, dtype=bool)
    ev[2, 0] = ev[4, 0] = ev[2, 1] = True
    news = np.zeros(shape, dtype=np.int64)
    news[2, 0] = 2
    s1 = np.full(shape, 0.01)
    s5 = np.full(shape, -0.02)
    s5[n - 5 :] = np.nan
    s1[n - 1 :] = np.nan
    return MarketData(
        "crypto", dates, ("KRW-A", "KRW-B"), np.full(shape, 0.1), np.full(shape, 0.02), ev, news,
        np.ones(n, dtype=bool), np.zeros(shape, dtype=bool), np.ones(shape, dtype=bool), {1: s1, 5: s5},
        {1: np.full(shape, 0.0015), 5: np.full(shape, 0.0015)},
    )  # fmt: skip


def test_new_events_once_and_only_after_since() -> None:
    md = _md()
    at = _ts(int(md.dates[-1]))
    first = new_events(md, set(), int(md.dates[2]) - 1, at)
    assert {(e.symbol, int(e.ref_at.timestamp())) for e in first} == {
        ("KRW-A", int(md.dates[2])),
        ("KRW-A", int(md.dates[4])),
        ("KRW-B", int(md.dates[2])),
    }
    known = {(e.symbol, int(e.ref_at.timestamp())) for e in first}
    assert new_events(md, known, 0, at) == []
    assert len(new_events(md, set(), int(md.dates[2]), at)) == 1  # since 그 봉은 제외(뒤 봉만)
    assert first[0].news_count in (0, 2)


def test_score_events_and_forward_sample() -> None:
    md = _md()
    d = md.dates
    rec = [
        EventRow("crypto", "KRW-A", _ts(int(d[2])), 0.1, 0.02, 2, False, True, True, _ts(int(d[2]) + 60)),
        EventRow("crypto", "KRW-A", _ts(int(d[4])), 0.1, 0.02, 0, False, True, True, _ts(int(d[4]) + 60)),
        EventRow("crypto", "KRW-B", _ts(int(d[2])), 0.1, 0.02, 0, False, True, True, _ts(int(d[3]) + 1)),  # 늦음
        EventRow("crypto", "KRW-B", _ts(int(d[10])), 0.1, 0.02, 0, False, True, True, _ts(int(d[10]) + 60)),
    ]
    out = {(e.symbol, e.ref_at): e for e in score_events(md, rec, _ts(int(d[-1])))}
    a = out[("KRW-A", _ts(int(d[2])))]
    assert a.in_time1 and a.s1 == 0.01 and a.s5 == -0.02 and a.scored_at is not None
    late = out[("KRW-B", _ts(int(d[2])))]
    assert late.in_time1 is False
    open_ = out[("KRW-B", _ts(int(d[10])))]
    assert open_.s1 == 0.01 and open_.s5 is None and open_.scored_at is None  # 5봉은 아직 — 다시 채점
    s1 = forward_sample(md, list(out.values()), 1)
    assert s1.s.size == 3 and int(s1.has.sum()) == 1  # 늦은 B 제외 · A 둘 · B(10)
    s5 = forward_sample(md, list(out.values()), 5)
    assert s5.s.size == 1  # A(2) — A(4) 는 쿨다운 5 안 · B(10) 라벨 없음
    assert math.isclose(float(s5.net[0]), -0.02 - 0.0015)


def test_title_times_filters_moves_bundles_and_future() -> None:
    d = Dictionary((), {"kr": ("급등",), "crypto": ()}, 2)
    now = datetime(2026, 11, 16, tzinfo=UTC)
    raw = [
        RawTitle("news", "삼성전자 신제품", ("005930",), now - timedelta(hours=1)),
        RawTitle("news", "삼성전자 급등", ("005930",), now - timedelta(hours=1)),  # 움직임을 전하는 제목
        RawTitle("news", "반도체 3종", ("005930", "000660", "042700"), now - timedelta(hours=1)),  # 묶음
        RawTitle(
            "disclosure", "공시 a", ("005930", "000660", "042700"), now - timedelta(hours=1)
        ),  # 공시는 묶음 규칙 밖
        RawTitle("news", "미래", ("005930",), now + timedelta(hours=1)),
    ]
    pub, every = title_times("kr", raw, d, ["005930", "000660"], now)
    assert pub["005930"].size == 2 and pub["000660"].size == 1
    assert every.size == 4  # 덮임은 거르기 전 · as_of 뒤는 뺀다

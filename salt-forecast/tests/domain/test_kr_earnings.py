"""FC-REQ-021 FR-11~15 — 결산마다 첫 실적 공시 · 확정 일정 · 다음 실적 공시 예상 창(워크포워드 채점)."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from salt_forecast.domain.events import ScheduledEvent
from salt_forecast.domain.kr_earnings import (
    MIN_SAMPLE,
    EarningsFiling,
    confirmed_schedules,
    earnings_events,
    fiscal_end_month,
    monthly_names,
    next_quarter_end,
    quarter_ends_before,
    reaction_anchor,
    to_scheduled_events,
    window,
)


def _pub(d: date) -> datetime:
    # 접수일 끝 23:59:59 KST — store.dart_published 의 백필 규칙
    return datetime(d.year, d.month, d.day, 14, 59, 59, tzinfo=UTC)


def _f(no: str, name: str, d: date, kind: str = "earnings", **kw: object) -> EarningsFiling:
    base: dict[str, object] = {
        "period_end": None,
        "scheduled_at": None,
        "time_known": None,
        "about_earnings": None,
        "doc_ok": False,
    }
    base.update(kw)
    return EarningsFiling(no, "005930", kind, name, d, _pub(d), **base)  # type: ignore[arg-type]


def _history(years: range, interim_lag: int = 30, annual_lag: int = 40) -> list[EarningsFiling]:
    """매 분기 잠정실적 — 분기 lag 일정 · 연간(12월) lag 일정."""
    out: list[EarningsFiling] = []
    for y in years:
        for m, last in ((3, 31), (6, 30), (9, 30), (12, 31)):
            end = date(y, m, last)
            lag = annual_lag if m == 12 else interim_lag
            out.append(_f(f"{y}{m:02d}", "연결재무제표기준영업(잠정)실적(공정공시)", end + timedelta(days=lag)))
    return out


def test_quarter_end_helpers() -> None:
    assert quarter_ends_before(date(2026, 11, 17)) == date(2026, 9, 30)
    assert quarter_ends_before(date(2026, 10, 1)) == date(2026, 9, 30)
    assert quarter_ends_before(date(2026, 9, 30)) == date(2026, 6, 30)  # 같은 날은 '이전' 아님
    assert quarter_ends_before(date(2026, 1, 5)) == date(2025, 12, 31)
    assert next_quarter_end(date(2026, 9, 30)) == date(2026, 12, 31)
    assert next_quarter_end(date(2025, 12, 31)) == date(2026, 3, 31)


def test_first_disclosure_per_period_wins_and_periodic_name_gives_period() -> None:
    fs = [
        _f("b", "분기보고서 (2026.09)", date(2026, 11, 14), period_end=date(2026, 9, 30)),
        _f("a", "연결재무제표기준영업(잠정)실적(공정공시)", date(2026, 10, 7)),
        _f("c", "반기보고서 (2026.06)", date(2026, 8, 14), period_end=date(2026, 6, 30)),
        _f("d", "사업보고서 (2025.12)", date(2026, 3, 18), period_end=date(2025, 12, 31)),
        _f("e", "매출액또는손익구조30%(대규모법인은15%)이상변경", date(2026, 2, 10)),
    ]
    evs = {e.period_end: e for e in earnings_events(fs)}
    assert evs[date(2026, 9, 30)].rcept_no == "a"  # 잠정실적이 분기보고서보다 먼저
    assert evs[date(2026, 6, 30)].rcept_no == "c"
    assert evs[date(2025, 12, 31)].rcept_no == "e"  # 손익구조 변경(2월) → 직전 사업연도 · 사업보고서보다 먼저
    assert evs[date(2025, 12, 31)].annual and not evs[date(2026, 9, 30)].annual
    assert evs[date(2026, 9, 30)].lag_days == 7


def test_fiscal_year_end_month_from_annual_report_name() -> None:
    assert fiscal_end_month([_f("x", "사업보고서 (2025.03)", date(2025, 6, 20), period_end=date(2025, 3, 31))]) == 3
    assert fiscal_end_month([]) == 12


def test_kr_earnings_event_anchors_previous_close_and_announces_at_publication() -> None:
    evs = earnings_events([_f("a", "영업(잠정)실적(공정공시)", date(2026, 10, 7))])
    [sch] = to_scheduled_events(evs, [])
    assert sch.kind == "kr_earnings" and sch.symbol == "005930"
    assert sch.event_at == sch.announced_at == _pub(date(2026, 10, 7))  # scheduled_event CHECK announced_at <= event_at
    # 반응 기준 시각 = 접수일 00:00 KST — 기준 봉 = 전 거래일 종가
    assert reaction_anchor(sch) == datetime(2026, 10, 6, 15, 0, tzinfo=UTC)
    assert reaction_anchor(ScheduledEvent("kr_cpi", sch.event_at, sch.event_at, "x", "x")) is None


def test_window_targets_next_unreported_quarter_and_scores_walk_forward() -> None:
    fs = _history(range(2016, 2026))
    fs.append(_f("q1", "영업(잠정)실적(공정공시)", date(2026, 4, 30)))
    fs.append(_f("q2", "영업(잠정)실적(공정공시)", date(2026, 7, 30)))
    w = window("005930", datetime(2026, 10, 20, tzinfo=UTC), earnings_events(fs), [], 12)
    assert w.period_end == date(2026, 9, 30) and not w.annual
    assert (w.lag_min, w.lag_max, w.window_from, w.window_to) == (30, 30, date(2026, 10, 30), date(2026, 10, 30))
    assert w.deadline == date(2026, 11, 14)
    assert w.sample == 32  # 분기 3 × 10년 + 2026 두 분기
    assert w.judged == w.sample - MIN_SAMPLE and w.hits == w.judged and w.misses == []
    assert w.renderable

    # 3분기 공시가 나온 뒤엔 다음 결산(연간) 창 — 연간 lag 만 쓴다
    fs.append(_f("q3", "영업(잠정)실적(공정공시)", date(2026, 10, 30)))
    w2 = window("005930", datetime(2026, 11, 2, tzinfo=UTC), earnings_events(fs), [], 12)
    assert w2.period_end == date(2026, 12, 31) and w2.annual
    assert (w2.lag_min, w2.lag_max, w2.sample) == (40, 40, 10)
    assert w2.deadline == date(2027, 3, 31)


def test_window_misses_record_when_actual_falls_outside_prior_range() -> None:
    fs = _history(range(2016, 2026))
    fs.append(_f("late", "영업(잠정)실적(공정공시)", date(2026, 3, 31) + timedelta(days=44)))
    w = window("005930", datetime(2026, 6, 1, tzinfo=UTC), earnings_events(fs), [], 12)
    assert w.misses[-1] == {"periodEnd": "2026-03-31", "actual": "2026-05-14", "from": "2026-04-30", "to": "2026-04-30"}
    assert w.hits == w.judged - 1


def test_blocked_reasons() -> None:
    few = _history(range(2025, 2026))  # 분기 3 · 연간 1
    w = window("005930", datetime(2026, 1, 10, tzinfo=UTC), earnings_events(few), [], 12)
    assert w.blocked_reason == "insufficient_sample" and not w.renderable
    # 창이 지났는데 공시가 없다 — 지난 창을 '예상'으로 보이지 않는다
    fs = _history(range(2016, 2026))
    late = window("005930", datetime(2026, 5, 15, tzinfo=UTC), earnings_events(fs), [], 12)
    assert late.period_end == date(2026, 3, 31) and late.blocked_reason == "window_passed"


def test_confirmed_schedule_only_earnings_ir_for_target_period_known_at_as_of() -> None:
    ir_at = datetime(2026, 10, 29, 1, 0, tzinfo=UTC)
    fs = [
        *_history(range(2016, 2026)),
        _f(
            "ndr",
            "기업설명회(IR)개최(안내공시)",
            date(2026, 10, 10),
            "ir",
            scheduled_at=datetime(2026, 10, 20, tzinfo=UTC),
            time_known=True,
            about_earnings=False,
            doc_ok=True,
        ),
        _f(
            "ir",
            "기업설명회(IR)개최(안내공시)",
            date(2026, 10, 8),
            "ir",
            scheduled_at=ir_at,
            time_known=True,
            about_earnings=True,
            doc_ok=True,
        ),
        _f(
            "pv",
            "결산실적공시예고(안내공시)",
            date(2026, 10, 23),
            "preview",
            scheduled_at=datetime(2026, 10, 29, 0, tzinfo=UTC),
            time_known=False,
            about_earnings=True,
            doc_ok=True,
            period_end=date(2026, 9, 30),
        ),
        _f("bad", "기업설명회(IR)개최(안내공시)", date(2026, 10, 9), "ir", doc_ok=False),
    ]
    conf = confirmed_schedules(fs)
    assert [(c.rcept_no, c.time_known) for c in conf] == [("ir", True)]  # 시각 아는 IR > 예고 · NDR · 미파싱 빠짐
    w = window("005930", datetime(2026, 10, 20, tzinfo=UTC), earnings_events(fs), conf, 12)
    assert w.confirmed is not None and w.confirmed.at == ir_at and w.confirmed.source == "ir"
    # 공시 전 as_of(10-08 접수 전)엔 모른다
    early = window("005930", datetime(2026, 10, 5, tzinfo=UTC), earnings_events(fs), conf, 12)
    assert early.confirmed is None
    [ev] = [e for e in to_scheduled_events([], conf)]
    assert (ev.kind, ev.event_at, ev.source) == ("kr_ir", ir_at, "dart_ir")


def test_monthly_series_with_same_name_is_not_quarterly_earnings() -> None:
    """현대차 — 월 판매를 "영업(잠정)실적(공정공시)" 으로 매달, 분기 실적은 "연결재무제표기준…" 으로 (2026 실측)."""
    fs: list[EarningsFiling] = []
    for y in (2025, 2026):
        for m in range(1, 13):
            fs.append(_f(f"m{y}{m}", "영업(잠정)실적(공정공시)", date(y, m, 1) + timedelta(days=1)))
    fs += [
        _f("q1", "연결재무제표기준영업(잠정)실적(공정공시)", date(2026, 4, 23)),
        _f("q2", "연결재무제표기준영업(잠정)실적(공정공시)", date(2026, 7, 23)),
    ]
    evs = {e.period_end: e.rcept_no for e in earnings_events(fs)}
    assert evs[date(2026, 3, 31)] == "q1" and evs[date(2026, 6, 30)] == "q2"
    assert all(not v.startswith("m") for v in evs.values())


def test_monthly_detection_needs_eight_in_a_year_quarterly_filer_unaffected() -> None:
    fs = _history(range(2016, 2026))  # 같은 이름 연 4건 — 분기
    assert monthly_names(fs) == set()
    seven = [_f(f"m{m}", "영업(잠정)실적(공정공시)", date(2026, m, 2)) for m in range(1, 8)]
    assert monthly_names(seven) == set()
    eighth = _f("m8", "영업(잠정)실적(공정공시)", date(2026, 8, 2))
    assert monthly_names([*seven, eighth]) == {"영업(잠정)실적(공정공시)"}


def test_twice_per_quarter_is_not_monthly() -> None:
    """삼성전자 · POSCO — 분기마다 잠정(초) · 확정(말) 두 번, 연 8건이지만 네 달(2026-11-17 첫 판 결함)."""
    name = "연결재무제표기준영업(잠정)실적(공정공시)"
    fs = [_f(f"{m}{d}", name, date(2026, m, d)) for m in (1, 4, 7, 10) for d in (7, 30)]
    assert monthly_names(fs) == set()
    evs = earnings_events(fs)
    assert [(e.period_end.month, e.rcept_date.day) for e in evs] == [(12, 7), (3, 7), (6, 7), (9, 7)]


def test_reaction_anchor_uses_previous_close_and_never_later_than_event() -> None:
    """장 전 공시 — 게시 시각(그날 끝)으로 잡으면 그날 종가가 기준이 되어 반응이 하루 밀린다."""
    import numpy as np
    import pytest

    from salt_forecast.domain.events import reaction
    from salt_forecast.domain.series import OhlcvSeries

    # 국내 일봉 — 07:00 UTC(16:00 KST) 마감. 10-05 · 10-06 · 10-07 · 10-08
    closes = np.array([100.0, 100.0, 110.0, 111.0])
    avail = np.array([int(datetime(2026, 10, d, 7, tzinfo=UTC).timestamp()) for d in (5, 6, 7, 8)], dtype=np.int64)
    bars = OhlcvSeries("005930", avail, closes, closes, closes, closes, np.full(4, 1.0))
    [ev] = to_scheduled_events(earnings_events([_f("a", "영업(잠정)실적(공정공시)", date(2026, 10, 7))]), [])
    as_of = datetime(2026, 11, 1, tzinfo=UTC)
    late = reaction(bars, ev, as_of)
    anchored = reaction(bars, ev, as_of, None, reaction_anchor(ev))
    assert late is not None and anchored is not None
    assert anchored.returns[1] == pytest.approx(0.10)  # 10-06 종가 → 10-07 종가: 공시일 하루를 담는다
    assert late.returns[1] == pytest.approx(111 / 110 - 1)  # 그날 끝 기준이면 다음 날만
    with pytest.raises(ValueError):
        reaction(bars, ev, as_of, None, ev.event_at + timedelta(seconds=1))


def test_notice_filed_after_its_own_schedule_is_dropped_and_first_notice_wins() -> None:
    """SK하이닉스 — 10-14 IR 공시(10-28 09:00) · 10-28 당일 정정. 정정은 일정 뒤 게시라 버리고 10-14 공시를 쓴다."""
    at = datetime(2026, 10, 28, 0, 0, tzinfo=UTC)  # 09:00 KST
    kw = {"scheduled_at": at, "time_known": True, "about_earnings": True, "doc_ok": True}
    first = _f("first", "기업설명회(IR)개최(안내공시)", date(2026, 10, 14), "ir", **kw)
    amended = _f("amend", "[기재정정]기업설명회(IR)개최(안내공시)", date(2026, 10, 28), "ir", **kw)
    [c] = confirmed_schedules([amended, first])
    assert c.rcept_no == "first" and c.announced_at <= c.at
    assert confirmed_schedules([amended]) == []

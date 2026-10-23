"""국내 주식 원천 이력 끊김 — 미수정 병합 점프(FC-REQ-020 FR-10)."""

from __future__ import annotations

from datetime import date

import numpy as np
import pytest

from salt_forecast.domain.calendar import KRX_CLOSE_AVAILABLE, KrxSessions, krx_session
from salt_forecast.domain.har import build_panel, forward_log_return
from salt_forecast.domain.kr_breaks import up_limit_breaks, with_breaks
from salt_forecast.domain.series import CloseSeries

# 011000 실측 모양(2026-07): 534 로 정지 → 재개일 2670(×5, KIS 수정주가 미반영)
_CLOSE = np.asarray([520.0, 530.0, 534.0, 534.0, 534.0, 2670.0, 2700.0, 2650.0, 2600.0, 2620.0])
_DATES = [
    date(2026, 7, 13), date(2026, 7, 14), date(2026, 7, 15), date(2026, 7, 16), date(2026, 7, 17),
    date(2026, 7, 20), date(2026, 7, 21), date(2026, 7, 22), date(2026, 7, 23), date(2026, 7, 24),
]  # fmt: skip
CAL = KrxSessions.from_dates(_DATES)
T = np.asarray([krx_session(d) + KRX_CLOSE_AVAILABLE for d in _DATES], dtype=np.int64)
BREAK = 5


def _series() -> CloseSeries:
    return with_breaks(CloseSeries("011000", T, _CLOSE))


def test_up_jump_beyond_limit_is_a_break_down_crash_is_not() -> None:
    assert up_limit_breaks(_CLOSE).tolist() == [i == BREAK for i in range(_CLOSE.size)]
    # 상한가(+30%)는 끊김이 아니다 · 정리매매 −90% 도 실제 손실이라 끊김이 아니다
    assert not up_limit_breaks(np.asarray([1000.0, 1300.0, 130.0])).any()


def test_as_of_cuts_at_last_break_known_then() -> None:
    s = _series()
    before = s.as_of(int(T[BREAK]) - 1)
    after = s.as_of(int(T[-1]))
    # 끊김 전 as_of 는 미래 끊김을 모른다 — 이력이 그대로
    assert before.close.tolist() == _CLOSE[:BREAK].tolist()
    # 끊김 뒤 as_of 는 끊김 봉부터 — 옛 기준 봉을 섞지 않는다
    assert after.close.tolist() == _CLOSE[BREAK:].tolist()


def test_realized_is_unknown_across_break() -> None:
    s = _series()
    # 끊김 전 주(7/13 주) as_of → 1주 뒤(7/20) 라벨은 534 → 2670 을 잇는다
    as_of = krx_session(date(2026, 7, 14))
    assert CAL.realized(s, as_of, 1) is None
    # 끊김 봉이 기준 종가인 as_of(7/21 장 전 — 기준 = 7/20 종가 2670)는 같은 기준이라 채점된다(달력이 1주를 다 안다면)
    assert not s.crosses_break(int(T[BREAK]), int(T[-1]))


def test_panel_drops_break_day_return_and_labels_across_it() -> None:
    c = _CLOSE[None, :]
    brk = up_limit_breaks(_CLOSE)[None, :]
    p = build_panel(c, c, c, c, np.ones_like(c), brk)
    assert np.isnan(p.r[0, BREAK])
    # 앞뒤 수익률은 기준과 무관해 그대로
    assert p.r[0, BREAK + 1] == pytest.approx(np.log(2700.0 / 2670.0))
    assert np.isnan(p.range_var[0, BREAK])
    ret = forward_log_return(c, 2, brk)
    assert np.isnan(ret[0, BREAK - 2]) and np.isnan(ret[0, BREAK - 1])  # (i, i+2] 에 끊김
    assert ret[0, BREAK] == pytest.approx(np.log(2650.0 / 2670.0))  # 끊김 봉에서 시작은 같은 기준
    assert ret[0, 0] == pytest.approx(np.log(534.0 / 520.0))


def test_no_breaks_is_unchanged() -> None:
    s = CloseSeries("000001", T, np.linspace(100.0, 110.0, T.size))
    w = with_breaks(s)
    assert w.breaks.size == 0
    assert w.as_of(int(T[4])).close.tolist() == s.as_of(int(T[4])).close.tolist()

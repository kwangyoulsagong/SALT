"""국내 주식 시점 고정 유니버스 — 사전등록 `kr-universe@1`(FC-REQ-020 FR-7).

as_of 마다 **그때 알던** 일봉만으로 대상을 고른다. 지금의 시총 순위로 과거를 고르면 "지난 몇 년 오른 종목"만 남는다
(P0 감사 — 위 꼬리 이탈 7~8%). 규칙 세 개는 전 종목 결과를 보기 전에 정했다
(`preregistration/2026-10-09-kr-universe.toml`).

거래대금 ≈ 수정 종가 × 수정 거래량. 원천에 거래대금 열이 없다.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

import numpy as np

from salt_forecast.domain.calendar import KrxSessions
from salt_forecast.domain.series import OhlcvSeries

KEY = "kr-universe@1"


@dataclass(frozen=True, slots=True)
class LiquidityRule:
    window_sessions: int = 20
    min_turnover_krw: float = 1_000_000_000.0
    min_bars: int = 250


RULE = LiquidityRule()


def eligible_at(
    bars: Mapping[str, OhlcvSeries], sessions: KrxSessions, as_of: int, rule: LiquidityRule = RULE
) -> frozenset[str]:
    """as_of 에 대상인 종목. 최근 거래일 window 개 전부에 봉이 있고 · 평균 거래대금 ≥ 하한 · 봉 ≥ min_bars."""
    recent = sessions.known_closes(as_of, rule.window_sessions)
    if recent.size < rule.window_sessions:
        return frozenset()
    first, last = int(recent[0]), int(recent[-1])
    out: list[str] = []
    for sym, s in bars.items():
        end = int(np.searchsorted(s.available_at, as_of, side="right"))
        if end < rule.min_bars:
            continue
        start = int(np.searchsorted(s.available_at, first, side="left"))
        t = s.available_at[start:end]
        if t.size != rule.window_sessions or int(t[-1]) != last:
            continue
        turnover = s.close[start:end] * s.volume[start:end]
        if np.isnan(turnover).any():
            continue
        if float(turnover.mean()) >= rule.min_turnover_krw:
            out.append(sym)
    return frozenset(out)

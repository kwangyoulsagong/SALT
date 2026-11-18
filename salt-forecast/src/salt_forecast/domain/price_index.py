"""소비자물가지수 — 그 달 값을 언제 알 수 있었나 (FC-REQ-024 FR-6).

원천(ECOS 901Y009 총지수)은 발표 시각을 주지 않는다. 국가데이터처 소비자물가동향 보도 시각은 이미 받는다
(`scheduled_event` `kr_cpi`, 슬라이스 24) — 그 달 다음에 처음 온 보도가 그 달을 발표한 것이다.
보도 기록이 없는 달(2021-01 이전 · 보도 표가 빈 때)은 **다음 달 15일 00:00 KST**
(보수 — 실제 발표는 다음 달 첫 주) — time-and-leakage.md §1.
I/O · 지금 시각 0.
"""

from __future__ import annotations

from bisect import bisect_right
from collections.abc import Sequence
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")
# 그 달 말일 뒤 이 날수 안에 온 보도만 그 달 발표로 본다(보도는 다음 달 첫 주) — 더 늦으면 다음 달 것이다
RELEASE_WINDOW = timedelta(days=20)
FALLBACK_DAY = 15


def _next_month(d: date) -> date:
    return date(d.year + d.month // 12, d.month % 12 + 1, 1)


def available_at(month: date, releases: Sequence[datetime]) -> datetime:
    """`month`(그 달 1일) 지수를 알게 된 시각. `releases` 는 오름차순 kr_cpi 보도 시각(tz-aware)."""
    start = datetime.combine(_next_month(month), time(0), tzinfo=KST)
    i = bisect_right(releases, start - timedelta(microseconds=1))
    if i < len(releases) and releases[i] < start + RELEASE_WINDOW:
        return releases[i]
    return datetime.combine(_next_month(month).replace(day=FALLBACK_DAY), time(0), tzinfo=KST)


def month_observed(month: date) -> datetime:
    """시리즈 점의 observed_at — 그 달 1일 00:00 KST(서버 뷰가 KST 날짜로 되돌린다)."""
    return datetime.combine(month.replace(day=1), time(0), tzinfo=KST)

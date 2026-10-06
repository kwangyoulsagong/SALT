"""검색 관심(네이버 데이터랩) — 이어 붙이기 · 신호. 순수 함수.

F010 슬라이스 6 3차 · FC-REQ-017 · 사전등록 search-interest@1.

## 상대 지수라 배율이 요청마다 다르다

데이터랩 검색어트렌드는 검색 횟수가 아니라 **요청 구간의 최댓값을 100 으로 둔 비율**을 준다. 같은 날 값이 요청마다
다르다. 그래서

1. 백필은 키워드 하나를 전 기간 한 요청으로 받는다 — 그 배율이 기준이다
2. 증분은 앞 구간을 겹쳐 받고, 겹친 날들의 비(기준 ÷ 새 값)의 **중앙값**으로 새 값을 기준 배율로 옮긴다
3. 신호는 **같은 시계열 안의 비율**(최근 7일 ÷ 앞 28일)이다 — 배율이 약분된다. 백필 배율에 미래 최댓값이 들어 있어도
   비율 신호에는 들어가지 않는다(누수 아님). 수준 값(오늘 지수 73)은 신호로 쓰지 않는다
"""

from __future__ import annotations

import math
from collections.abc import Mapping
from datetime import UTC, date, datetime, timedelta, timezone
from statistics import median

SOURCE = "naver_datalab"
KST = timezone(timedelta(hours=9))
# 그날 하루치가 다음 날 집계된다고 보고 하루 더 — 공개 시각 미상이라 보수 추정(사전등록 search-interest@1 times)
AVAILABLE_LAG = timedelta(hours=48)


def series_id(symbol: str) -> str:
    return f"naver:search:{symbol}"


def observed_at(d: date) -> datetime:
    """그날 00:00 KST(UTC 로)."""
    return datetime(d.year, d.month, d.day, tzinfo=KST).astimezone(UTC)


def last_known_day(t: datetime) -> date:
    """available_at = observed_at + 48h ≤ t 인 마지막 날."""
    d = t.astimezone(KST).date()
    while observed_at(d) + AVAILABLE_LAG > t:
        d -= timedelta(days=1)
    return d


# 겹친 날 수가 이보다 적거나, 비가 이만큼 넘게 흩어지면 이어 붙이지 않는다(원천이 바뀌었거나 값이 0 근처)
MIN_OVERLAP = 28
MAX_DISPERSION = 0.25  # 비의 사분위 범위 ÷ 중앙값


def chain_link(stored: Mapping[date, float], fresh: Mapping[date, float]) -> dict[date, float] | None:
    """`fresh` 를 `stored` 배율로 옮겨 **새 날짜만** 돌려준다. 이어 붙일 수 없으면 None(그날은 쌓지 않는다)."""
    ratios = sorted(stored[d] / fresh[d] for d in stored.keys() & fresh.keys() if stored[d] > 0 and fresh[d] > 0)
    if len(ratios) < MIN_OVERLAP:
        return None
    mid = median(ratios)
    q1, q3 = ratios[len(ratios) // 4], ratios[(3 * len(ratios)) // 4]
    if mid <= 0 or (q3 - q1) / mid > MAX_DISPERSION:
        return None
    last = max(stored)
    return {d: v * mid for d, v in fresh.items() if d > last}


def fill_days(points: Mapping[date, float], start: date, end: date) -> dict[date, float]:
    """응답에 없는 날은 0 — 데이터랩은 검색이 없던 날을 빼고 준다(요청 구간 안에서만 채운다)."""
    out: dict[date, float] = {}
    d = start
    while d <= end:
        out[d] = points.get(d, 0.0)
        d += timedelta(days=1)
    return out


SHORT_DAYS = 7
LONG_DAYS = 28
# 앞 28일 평균이 이보다 작으면 결측 — 0 에 가까운 분모가 신호를 폭발시킨다(지수 단위, 최댓값 100)
MIN_BASE = 0.5


def spike(series: Mapping[date, float], last_day: date) -> float | None:
    """ln(최근 7일 평균 ÷ 그 앞 28일 평균). `last_day` 까지(포함) 알 수 있는 날만 쓴다. 날짜가 비면 None."""
    short = [series.get(last_day - timedelta(days=i)) for i in range(SHORT_DAYS)]
    long = [series.get(last_day - timedelta(days=SHORT_DAYS + i)) for i in range(LONG_DAYS)]
    if any(v is None for v in short) or any(v is None for v in long):
        return None
    s = sum(v for v in short if v is not None) / SHORT_DAYS
    base = sum(v for v in long if v is not None) / LONG_DAYS
    if base < MIN_BASE or s <= 0:
        return None
    return math.log(s / base)

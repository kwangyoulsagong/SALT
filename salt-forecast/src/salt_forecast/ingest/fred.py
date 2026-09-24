"""FRED / ALFRED — 금리 · 환율 · 지수 · 물가. 키 필요(FORECAST_FRED_API_KEY).

**빈티지로 받는다**(realtime 전 구간): 같은 관측일이라도 발표 후 수정되면 다른 행이다. available_at = 그 빈티지가
시작된 날의 다음 날 00:00 UTC(FRED 의 realtime 은 날짜 단위라 보수적으로 하루 뒤) — time-and-leakage.md §1 · §3.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, date, datetime, timedelta

import httpx

from salt_forecast.ingest.http import Pacer, get_json
from salt_forecast.store.series import SeriesPoint

SOURCE = "fred"

# FEATURE-008 FR-50~52. (시리즈, 단위)
SERIES: dict[str, str] = {
    "DFF": "percent",  # 연방기금 실효금리
    "DGS2": "percent",  # 2년물
    "DGS10": "percent",  # 10년물
    "DTWEXBGS": "index",  # 광의 달러 인덱스
    "DEXKOUS": "krw_per_usd",  # 원/달러
    # SP500 은 ALFRED(빈티지)에 없다(S&P 라이선스) — 시점 고정이 안 되므로 넣지 않는다. 나스닥이 같은 신호를 준다
    "NASDAQCOM": "index",
    "VIXCLS": "index",
    "CPIAUCSL": "index",  # 월간 · 수정 잦음
}


def _day(s: str) -> datetime:
    d = date.fromisoformat(s)
    return datetime(d.year, d.month, d.day, tzinfo=UTC)


# 한 요청의 빈티지 상한(2000). 일간 시리즈는 영업일마다 빈티지가 생겨 약 500/년 — 2년 창이면 여유 있다.
REALTIME_WINDOW = timedelta(days=730)


def observations(
    client: httpx.Client, base_url: str, api_key: str, pacer: Pacer, series_id: str, since: date, now: datetime
) -> Iterator[SeriesPoint]:
    """since 이후 빈티지를 2년 창으로 나눠 받는다.

    창 경계에서 같은 (관측일, 빈티지 시작)이 겹치면 upsert 가 하나로 만든다.

    빈티지 시작이 창 시작보다 이른 행은 FRED 가 창 시작으로 잘라 준다 — 그 경우 available_at 이 실제보다 **늦어질** 뿐
    (보수적) 이르게 되지는 않는다.
    """
    unit = SERIES[series_id]
    window_start = since
    end = now.date()
    while window_start <= end:
        window_end = min(end, window_start + REALTIME_WINDOW)
        rows = get_json(
            client,
            f"{base_url.rstrip('/')}/series/observations",
            {
                "series_id": series_id,
                "api_key": api_key,
                "file_type": "json",
                "observation_start": since.isoformat(),
                "realtime_start": window_start.isoformat(),
                "realtime_end": window_end.isoformat(),
            },
            pacer,
            label=f"fred:{series_id}",
        )
        for o in rows.get("observations", []):
            if o["value"] in (".", ""):
                continue  # 결측은 결측으로 — 0 으로 채우지 않는다
            available = _day(o["realtime_start"]) + timedelta(days=1)
            if available > now:
                continue
            yield SeriesPoint(SOURCE, series_id, _day(o["date"]), available, float(o["value"]), unit)
        window_start = window_end + timedelta(days=1)

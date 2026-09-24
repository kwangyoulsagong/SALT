"""거시 일정 — FC-REQ-005 FR-1. CPI · 고용보고서는 FRED 발표 일정, FOMC 는 연준 공식 일정 페이지.

두 소스 모두 **미래 예정일**을 준다(FRED `include_release_dates_with_no_data`). 소스 표: security-sources.md §1.
연준 페이지 구조가 바뀌어 0건이면 SourceError — 조용히 비우지 않는다(FR-7).
"""

from __future__ import annotations

import re
from datetime import date

import httpx

from salt_forecast.domain.events import ScheduledEvent, scheduled
from salt_forecast.ingest.http import TIMEOUT, Pacer, SourceError, get_json

FRED_RELEASES = {"cpi": 10, "jobs": 50}
FOMC_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
# 서비스 이름만 — 개인 정보를 싣지 않는다
USER_AGENT = "SALT-forecast/0.1"
# 연준 페이지가 여는 해 — 그 앞은 BTC 원화 일봉도 없다
FOMC_FIRST_YEAR = 2021

_MONTHS = {
    m: i + 1
    for i, m in enumerate(
        [
            "january",
            "february",
            "march",
            "april",
            "may",
            "june",
            "july",
            "august",
            "september",
            "october",
            "november",
            "december",
        ]
    )
}
_MONTHS.update({m[:3]: i for m, i in list(_MONTHS.items())})


def fred_release_events(
    client: httpx.Client, base_url: str, api_key: str, pacer: Pacer, kind: str, since: date
) -> list[ScheduledEvent]:
    """발표일(과거 + 예정). FRED 는 날짜만 준다 — 시각은 domain 이 발표 관례로 붙인다."""
    release_id = FRED_RELEASES[kind]
    rows = get_json(
        client,
        f"{base_url.rstrip('/')}/release/dates",
        {
            "release_id": release_id,
            "api_key": api_key,
            "file_type": "json",
            "include_release_dates_with_no_data": "true",
            "sort_order": "asc",
            "limit": 10000,
        },
        pacer,
        label=f"fred release {release_id}",
    )
    days = [date.fromisoformat(r["date"]) for r in rows.get("release_dates", [])]
    return [scheduled(kind, d, "fred", f"release:{release_id}") for d in monthly_release_days(days) if d >= since]


def monthly_release_days(days: list[date]) -> list[date]:
    """한 달에 한 번 — 그 달의 **마지막** 발표일. FRED 발표 일정에는 계절 조정 계수 개정일(예: 2021-02-08)도
    섞여 있고, 그 날은 본 발표(2021-02-10)보다 앞선다."""
    last: dict[tuple[int, int], date] = {}
    for d in days:
        key = (d.year, d.month)
        if key not in last or d > last[key]:
            last[key] = d
    return sorted(last.values())


def parse_fomc_calendar(html: str) -> list[date]:
    """연도 패널마다 (월, 날짜 범위) 쌍. 결정일 = 범위의 마지막 날 · 마지막 달("Apr/May" 30-1 → 5월 1일).

    범위가 아닌 항목("22 (notation vote)" · "(unscheduled)")은 정례 결정이 아니라 뺀다.
    """
    out: list[date] = []
    parts = re.split(r'<h4><a id="\d+">(\d{4}) FOMC Meetings', html)
    for k in range(1, len(parts), 2):
        year = int(parts[k])
        pairs = re.findall(
            r"fomc-meeting__month[^>]*>(?:<strong>)?([^<]+)</strong>.*?fomc-meeting__date[^>]*>([^<]+)<",
            parts[k + 1],
            re.S,
        )
        for month_text, day_text in pairs:
            m = re.fullmatch(r"\s*(\d{1,2})-(\d{1,2})\*?\s*", day_text)
            month = _MONTHS.get(month_text.strip().split("/")[-1].strip().lower()[:3])
            if m is None or month is None:
                continue
            out.append(date(year, month, int(m.group(2))))
    return sorted(set(out))


def fomc_events(client: httpx.Client, pacer: Pacer) -> list[ScheduledEvent]:
    pacer.wait()
    try:
        res = client.get(FOMC_URL, headers={"User-Agent": USER_AGENT, "Accept": "text/html"}, timeout=TIMEOUT)
    except httpx.TransportError as e:
        raise SourceError(f"fomc 연결 실패: {type(e).__name__}", retryable=True) from e
    if res.status_code != 200:
        raise SourceError(f"fomc {res.status_code}", retryable=res.status_code >= 500)
    days = [d for d in parse_fomc_calendar(res.text) if d.year >= FOMC_FIRST_YEAR]
    if not days:
        raise SourceError("fomc 일정 0건 — 페이지 구조가 바뀌었을 수 있다", retryable=False)
    return [scheduled("fomc", d, "federalreserve", FOMC_URL) for d in days]

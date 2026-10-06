"""네이버 데이터랩(FC-REQ-017) — 녹화 응답, 네트워크 0(respx)."""

from __future__ import annotations

import json
from datetime import UTC, date, datetime
from pathlib import Path

import httpx
import pytest
import respx

from salt_forecast.ingest import naver_datalab as dl
from salt_forecast.ingest.http import Pacer, SourceError

URL = "https://openapi.naver.com/v1/datalab/search"
FIX = Path(__file__).parent / "fixtures" / "naver_datalab" / "search.json"
START, END = date(2026, 9, 1), date(2026, 9, 5)


def _call(client: httpx.Client) -> dict[date, float]:
    return dl.search_daily(client, URL, "id", "secret", Pacer(1000), "비트코인", START, END)


@respx.mock
def test_parses_points_and_sends_one_group_with_keys() -> None:
    route = respx.post(URL).mock(return_value=httpx.Response(200, json=json.loads(FIX.read_text())))
    with httpx.Client() as c:
        got = _call(c)
    assert got == {date(2026, 9, 1): 40.5, date(2026, 9, 2): 100.0, date(2026, 9, 4): 12.25}
    req = route.calls.last.request
    assert req.headers["X-Naver-Client-Id"] == "id" and req.headers["X-Naver-Client-Secret"] == "secret"
    body = json.loads(req.content)
    assert body["timeUnit"] == "date" and body["keywordGroups"] == [{"groupName": "비트코인", "keywords": ["비트코인"]}]


@respx.mock
def test_auth_error_is_not_retried_and_hides_key() -> None:
    route = respx.post(URL).mock(return_value=httpx.Response(401, json={"errorMessage": "Authentication failed"}))
    with httpx.Client() as c, pytest.raises(SourceError) as e:
        _call(c)
    assert route.call_count == 1 and "secret" not in str(e.value) and not e.value.retryable


@respx.mock
def test_out_of_range_ratio_is_rejected() -> None:
    bad = {"results": [{"title": "x", "data": [{"period": "2026-09-01", "ratio": 140}]}]}
    respx.post(URL).mock(return_value=httpx.Response(200, json=bad))
    with httpx.Client() as c, pytest.raises(SourceError):
        _call(c)


def test_times_are_kst_day_start_and_two_day_lag() -> None:
    o = dl.observed_at(date(2026, 9, 2))
    assert o == datetime(2026, 9, 1, 15, tzinfo=UTC)
    assert o + dl.AVAILABLE_LAG == datetime(2026, 9, 3, 15, tzinfo=UTC)

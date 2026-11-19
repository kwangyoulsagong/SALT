"""ECOS 소비자물가 — 녹화 응답(2026-11-18 실제 · 표본 키 · 잘못된 키 · 자료 없음), 네트워크 0."""

from __future__ import annotations

import json
from datetime import UTC, date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import httpx
import pytest
import respx

from salt_forecast.ingest import ecos
from salt_forecast.ingest.http import Pacer, SourceError

FIX = Path(__file__).parent / "fixtures" / "ecos"
BASE = "https://ecos.bok.or.kr/api"
KST = ZoneInfo("Asia/Seoul")


def _load(name: str) -> object:
    return json.loads((FIX / name).read_text(encoding="utf-8"))


def test_parse_recorded_rows() -> None:
    total, months = ecos.parse(_load("cpi_2025.json"))
    assert total == 4
    assert [(m.month, m.value, m.base) for m in months][:2] == [
        (date(2025, 1, 1), 115.71, "2020=100"),
        (date(2025, 2, 1), 116.08, "2020=100"),
    ]


def test_no_data_is_empty_and_bad_key_fails_without_retry() -> None:
    assert ecos.parse(_load("no_data.json")) == (0, [])
    with pytest.raises(SourceError) as e:
        ecos.parse(_load("bad_key.json"))
    assert not e.value.retryable
    assert "INFO-100" in str(e.value)


@respx.mock
def test_fetch_keeps_key_out_of_errors_and_rejects_mixed_base() -> None:
    body = _load("cpi_2025.json")
    respx.get(url__startswith=f"{BASE}/StatisticSearch/SECRETKEY/").mock(return_value=httpx.Response(200, json=body))
    with httpx.Client() as c:
        months = ecos.cpi_months(c, BASE, "SECRETKEY", Pacer(1000), date(2025, 4, 30))
    assert len(months) == 4
    mixed = json.loads(json.dumps(body))
    mixed["StatisticSearch"]["row"][0]["UNIT_NAME"] = "2025=100"
    respx.get(url__startswith=f"{BASE}/StatisticSearch/SECRETKEY/").mock(return_value=httpx.Response(200, json=mixed))
    with httpx.Client() as c, pytest.raises(SourceError) as e:
        ecos.cpi_months(c, BASE, "SECRETKEY", Pacer(1000), date(2025, 4, 30))
    assert "SECRETKEY" not in str(e.value)
    respx.get(url__startswith=f"{BASE}/StatisticSearch/SECRETKEY/").mock(return_value=httpx.Response(500))
    with httpx.Client() as c, pytest.raises(SourceError) as e:
        ecos.cpi_months(c, BASE, "SECRETKEY", Pacer(1000), date(2025, 4, 30))
    assert "SECRETKEY" not in str(e.value)


def test_points_drop_months_not_yet_released() -> None:
    _, months = ecos.parse(_load("cpi_2025.json"))
    releases = [datetime(2025, 3, 5, 8, tzinfo=KST), datetime(2025, 4, 2, 8, tzinfo=KST)]
    now = datetime(2025, 4, 2, 0, tzinfo=UTC)  # 3월분 보도(08:00 KST = 전날 23:00 UTC) 직후 — 4월분은 아직
    pts = ecos.to_points(months, releases, now)
    assert [p.observed_at.astimezone(KST).date() for p in pts] == [date(2025, 1, 1), date(2025, 2, 1), date(2025, 3, 1)]
    assert pts[1].available_at == datetime(2025, 3, 5, 8, tzinfo=KST)
    assert pts[0].available_at == datetime(2025, 2, 15, tzinfo=KST)  # 보도 기록 없음 — 보수
    assert all(p.available_at <= now for p in pts)


# ── 코스피 밸류에이션(FC-REQ-029) ──────────────────────────────────────────────


def test_kospi_rows_skip_blank_and_other_items() -> None:
    from salt_forecast.ingest.ecos import parse_rows

    raw = {
        "StatisticSearch": {
            "list_total_count": 3,
            "row": [
                {"TIME": "202608", "DATA_VALUE": "18.64", "ITEM_CODE1": "1110000"},
                {"TIME": "202609", "DATA_VALUE": " ", "ITEM_CODE1": "1110000"},
                {"TIME": "202609", "DATA_VALUE": "2.1", "ITEM_CODE1": "1100000"},
            ],
        }
    }
    assert parse_rows(raw, "1110000") == (3, [("202608", 18.64)])


def test_kospi_availability_is_conservative() -> None:
    from datetime import UTC, datetime

    from salt_forecast.ingest.ecos import available_of, observed_of

    sep = observed_of("202609")
    assert sep == datetime(2026, 9, 1, tzinfo=UTC)
    # 9월 30일 + 50일 = 11월 19일 — 2026-11-19 에 9월이 보이고 그 전엔 없다
    assert available_of(sep, "M") == datetime(2026, 11, 19, tzinfo=UTC)
    assert available_of(observed_of("202612"), "M") == datetime(2027, 2, 19, tzinfo=UTC)
    day = observed_of("20261113")
    assert available_of(day, "D") == datetime(2026, 11, 14, tzinfo=UTC)

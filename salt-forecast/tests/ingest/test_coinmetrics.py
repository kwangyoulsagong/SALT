import json
from datetime import UTC, datetime
from pathlib import Path

import httpx
import respx

from salt_forecast.ingest import coinmetrics
from salt_forecast.ingest.http import Pacer

FIX = Path(__file__).parent / "fixtures" / "coinmetrics"
BASE = "https://community-api.coinmetrics.io/v4"
URL = f"{BASE}/timeseries/asset-metrics"


def _body() -> dict[str, object]:
    return json.loads((FIX / "btc_daily.json").read_text())


@respx.mock
def test_available_two_days_after_the_day_and_unknown_until_then() -> None:
    respx.get(URL).mock(return_value=httpx.Response(200, json=_body()))
    # 10-05 의 값은 10-07 00:00 에야 안다고 본다 — now 가 그 직전이면 10-03 · 04 만
    now = datetime(2026, 10, 6, 23, 59, tzinfo=UTC)
    with httpx.Client() as c:
        pts = list(coinmetrics.daily(c, BASE, Pacer(1000), {}, now))
    days = sorted({p.observed_at.date().isoformat() for p in pts})
    assert days == ["2026-10-03", "2026-10-04"]
    mvrv = [p for p in pts if p.series_id == "cm:btc:CapMVRVCur"]
    assert mvrv[0].available_at == datetime(2026, 10, 5, tzinfo=UTC)
    assert {p.series_id for p in pts} == {coinmetrics.series_id(m) for m in coinmetrics.METRICS}


@respx.mock
def test_incremental_skips_days_already_seen_per_metric() -> None:
    respx.get(URL).mock(return_value=httpx.Response(200, json=_body()))
    now = datetime(2026, 10, 8, tzinfo=UTC)
    since = {coinmetrics.series_id(m): datetime(2026, 10, 4, tzinfo=UTC) for m in coinmetrics.METRICS}
    with httpx.Client() as c:
        pts = list(coinmetrics.daily(c, BASE, Pacer(1000), since, now))
    # 이미 받은 날(≤ 10-04)을 다시 쓰지 않는다 — flash 값이 고쳐져도 처음 본 값이 그 시점에 알던 값이다
    assert {p.observed_at.date().isoformat() for p in pts} == {"2026-10-05"}


@respx.mock
def test_follows_next_page_token() -> None:
    first = _body()
    first["next_page_token"] = "abc"
    second = {"data": [{"asset": "btc", "time": "2026-10-06T00:00:00.000000000Z", "CapMVRVCur": "1.5"}]}
    tokens: list[str | None] = []

    def reply(request: httpx.Request) -> httpx.Response:
        tokens.append(request.url.params.get("next_page_token"))
        return httpx.Response(200, json=first if len(tokens) == 1 else second)

    respx.get(URL).mock(side_effect=reply)
    now = datetime(2026, 10, 9, tzinfo=UTC)
    with httpx.Client() as c:
        pts = list(coinmetrics.daily(c, BASE, Pacer(1000), {}, now))
    assert tokens == [None, "abc"]
    assert max(p.observed_at for p in pts) == datetime(2026, 10, 6, tzinfo=UTC)

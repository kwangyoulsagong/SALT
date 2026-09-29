import json
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pytest
import respx

from salt_forecast.ingest.http import SourceError
from salt_forecast.ingest.upbit import Pacer, UpbitDaily

FIX = Path(__file__).parent / "fixtures" / "upbit"
AT = datetime(2026, 9, 30, 1, tzinfo=UTC)


@respx.mock
def test_market_warnings_krw_only_sorted_cautions() -> None:
    body = json.loads((FIX / "market_all_details.json").read_text())
    route = respx.get("https://api.upbit.com/v1/market/all").mock(return_value=httpx.Response(200, json=body))
    with httpx.Client() as c:
        rows = UpbitDaily(c, "https://api.upbit.com/v1", Pacer(1000)).market_warnings(AT)
    assert route.calls.last.request.url.params["is_details"] == "true"
    assert [(r.symbol, r.warning, r.cautions) for r in rows] == [
        ("KRW-BTC", False, ()),
        ("KRW-ABC", True, ("GLOBAL_PRICE_DIFFERENCES", "PRICE_FLUCTUATIONS")),
    ]
    assert all(r.fetched_at == AT for r in rows)


@respx.mock
def test_market_warnings_empty_is_error_not_silence() -> None:
    respx.get("https://api.upbit.com/v1/market/all").mock(return_value=httpx.Response(200, json=[]))
    with httpx.Client() as c, pytest.raises(SourceError):
        UpbitDaily(c, "https://api.upbit.com/v1", Pacer(1000)).market_warnings(AT)

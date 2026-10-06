import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx
import pytest
import respx

from salt_forecast.ingest import coingecko
from salt_forecast.ingest.http import Pacer, SourceError

FIX = Path(__file__).parent / "fixtures" / "coingecko"
BASE = "https://api.coingecko.com/api/v3"


def _body() -> dict[str, dict[str, object]]:
    return json.loads((FIX / "global.json").read_text())


@respx.mock
def test_snapshot_uses_source_update_time_and_fetch_time() -> None:
    body = _body()
    respx.get(f"{BASE}/global").mock(return_value=httpx.Response(200, json=body))
    updated = datetime.fromtimestamp(int(body["data"]["updated_at"]), tz=UTC)  # pyright: ignore[reportArgumentType]
    fetched = updated + timedelta(minutes=5)
    with httpx.Client() as c:
        pts = coingecko.global_snapshot(c, BASE, Pacer(1000), fetched)
    by = {p.series_id: p for p in pts}
    assert set(by) == {coingecko.DOMINANCE_BTC, coingecko.DOMINANCE_ETH, coingecko.TOTAL_MCAP_USD}
    assert all(p.observed_at == updated and p.available_at == fetched for p in pts)
    assert 0 < by[coingecko.DOMINANCE_BTC].value < 100


@respx.mock
def test_stale_source_is_a_failure_not_a_row() -> None:
    body = _body()
    respx.get(f"{BASE}/global").mock(return_value=httpx.Response(200, json=body))
    updated = datetime.fromtimestamp(int(body["data"]["updated_at"]), tz=UTC)  # pyright: ignore[reportArgumentType]
    with httpx.Client() as c, pytest.raises(SourceError):
        coingecko.global_snapshot(c, BASE, Pacer(1000), updated + timedelta(hours=7))

import json
from datetime import UTC, datetime
from pathlib import Path

import httpx
import respx

from salt_forecast.ingest.upbit import Pacer, UpbitDaily

FIX = Path(__file__).parent / "fixtures" / "upbit"
BASE = "https://api.upbit.com/v1"


@respx.mock
def test_drops_unclosed_candle_and_sets_available_at() -> None:
    respx.get(f"{BASE}/candles/days").mock(
        return_value=httpx.Response(200, json=json.loads((FIX / "days_btc.json").read_text()))
    )
    now = datetime(2026, 9, 23, 5, 0, tzinfo=UTC)  # 09-23 봉은 아직 안 닫혔다
    with httpx.Client() as c:
        bars = list(UpbitDaily(c, BASE, Pacer(1000)).fetch("KRW-BTC", datetime(2026, 9, 1, tzinfo=UTC), now, now))
    assert [b.open_time.day for b in bars] == [22, 21]
    assert all(b.available_at == b.close_time and b.close_time.hour == 0 for b in bars)
    assert all(b.open_time.tzinfo is not None for b in bars)


@respx.mock
def test_4xx_is_not_retried() -> None:
    route = respx.get(f"{BASE}/candles/days").mock(return_value=httpx.Response(400, json={"error": {}}))
    with httpx.Client() as c:
        api = UpbitDaily(c, BASE, Pacer(1000))
        try:
            list(
                api.fetch(
                    "KRW-XXX",
                    datetime(2026, 9, 1, tzinfo=UTC),
                    datetime(2026, 9, 2, tzinfo=UTC),
                    datetime(2026, 9, 3, tzinfo=UTC),
                )
            )
        except Exception as e:
            assert getattr(e, "retryable", None) is False
    assert route.call_count == 1


def test_pacer_backs_off_when_remaining_zero() -> None:
    import time

    p = Pacer(1000)
    p.observe("group=candles; min=600; sec=0")
    assert p.next_at > time.monotonic() + 0.9
    q = Pacer(1000)
    q.observe("group=candles; min=600; sec=5")
    assert q.next_at <= time.monotonic()

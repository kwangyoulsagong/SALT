from datetime import UTC, date, datetime, timedelta

import httpx
import respx

from salt_forecast.ingest import binance, defillama, fred
from salt_forecast.ingest.http import Pacer

NOW = datetime(2026, 9, 23, 6, 0, tzinfo=UTC)


@respx.mock
def test_fred_keeps_vintages_and_skips_missing() -> None:
    respx.get("https://api.stlouisfed.org/fred/series/observations").mock(
        return_value=httpx.Response(
            200,
            json={
                "observations": [
                    {
                        "realtime_start": "2026-08-12",
                        "realtime_end": "2026-09-10",
                        "date": "2026-07-01",
                        "value": "320.1",
                    },
                    {
                        "realtime_start": "2026-09-11",
                        "realtime_end": "9999-12-31",
                        "date": "2026-07-01",
                        "value": "320.4",
                    },
                    {"realtime_start": "2026-09-12", "realtime_end": "9999-12-31", "date": "2026-08-01", "value": "."},
                ]
            },
        )
    )
    with httpx.Client() as c:
        pts = list(
            fred.observations(c, "https://api.stlouisfed.org/fred", "k", Pacer(1000), "CPIAUCSL", date(2026, 1, 1), NOW)
        )
    assert [p.value for p in pts] == [320.1, 320.4]  # 수정 전 · 후 두 빈티지, 결측은 버린다
    assert pts[0].available_at == datetime(2026, 8, 13, tzinfo=UTC)  # 빈티지 시작 다음 날
    assert pts[0].observed_at == pts[1].observed_at


@respx.mock
def test_fred_error_does_not_leak_api_key() -> None:
    respx.get("https://api.stlouisfed.org/fred/series/observations").mock(return_value=httpx.Response(400))
    with httpx.Client() as c:
        try:
            list(
                fred.observations(
                    c, "https://api.stlouisfed.org/fred", "SECRET123", Pacer(1000), "DFF", date(2026, 1, 1), NOW
                )
            )
        except Exception as e:
            assert "SECRET123" not in str(e)


@respx.mock
def test_binance_spot_drops_open_bar_and_oi_lag() -> None:
    today = int(datetime(2026, 9, 23, tzinfo=UTC).timestamp() * 1000)
    yday = today - 86_400_000
    respx.get("https://api.binance.com/api/v3/klines").mock(
        return_value=httpx.Response(
            200, json=[[yday, "1", "2", "0.5", "1.5", "10"], [today, "1", "2", "0.5", "1.5", "10"]]
        )
    )
    ts = int((NOW - timedelta(minutes=2)).timestamp() * 1000)
    respx.get("https://fapi.binance.com/futures/data/openInterestHist").mock(
        return_value=httpx.Response(
            200,
            json=[
                {"symbol": "BTCUSDT", "sumOpenInterestValue": "9.1e9", "timestamp": ts - 3_600_000},
                {"symbol": "BTCUSDT", "sumOpenInterestValue": "9.2e9", "timestamp": ts},
            ],
        )
    )
    with httpx.Client() as c:
        api = binance.Binance(c, "https://fapi.binance.com", "https://api.binance.com", Pacer(1000))
        bars = list(api.spot_daily("BTC", datetime(2026, 9, 22, tzinfo=UTC), NOW))
        oi = list(api.open_interest("BTC", NOW))
    assert len(bars) == 1 and bars[0].available_at == datetime(2026, 9, 23, tzinfo=UTC)
    assert len(oi) == 1  # 2분 전 스냅샷은 공개 지연(5분) 전이라 아직 없다


@respx.mock
def test_defillama_available_next_day() -> None:
    d = int(datetime(2026, 9, 22, tzinfo=UTC).timestamp())
    respx.get("https://stablecoins.llama.fi/stablecoincharts/all").mock(
        return_value=httpx.Response(
            200,
            json=[
                {"date": str(d), "totalCirculatingUSD": {"peggedUSD": 3.1e11}},
                {"date": str(d + 86_400), "totalCirculatingUSD": {"peggedUSD": 3.2e11}},
            ],
        )
    )
    with httpx.Client() as c:
        pts = list(defillama.stablecoin_total(c, "https://stablecoins.llama.fi", Pacer(1000), NOW))
    assert len(pts) == 1 and pts[0].available_at == datetime(2026, 9, 23, tzinfo=UTC)

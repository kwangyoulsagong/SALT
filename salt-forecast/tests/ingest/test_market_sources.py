from datetime import UTC, date, datetime, timedelta

import httpx
import respx

from salt_forecast.ingest import binance, defillama, fear_greed, fred
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
            200,
            json=[
                # kline 12칸 — 7 거래대금 · 8 체결 수 · 9 테이커 매수 수량
                [yday, "1", "2", "0.5", "1.5", "10", yday + 86_399_999, "15", 100, "6", "9", "0"],
                [today, "1", "2", "0.5", "1.5", "10", today + 86_399_999, "15", 100, "6", "9", "0"],
                [yday - 86_400_000, "1", "2", "0.5", "1.5", "0", yday - 1, "0", 0, "0", "0", "0"],
            ],
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
    assert len(bars) == 2
    closed = next(d for d in bars if d.bar.volume)
    assert closed.bar.available_at == datetime(2026, 9, 23, tzinfo=UTC)
    assert closed.taker_buy_ratio is not None and closed.taker_buy_ratio.value == 0.6
    assert closed.taker_buy_ratio.series_id == "taker_buy_ratio:BTC"
    assert next(d for d in bars if not d.bar.volume).taker_buy_ratio is None  # 거래량 0 은 비율 없음(0 이 아니다)
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


@respx.mock
def test_ecb_usd_krw_available_next_day_and_drops_future() -> None:
    from salt_forecast.ingest import ecb

    respx.get("https://api.frankfurter.dev/v1/2026-09-20..2026-09-23").mock(
        return_value=httpx.Response(
            200,
            json={
                "amount": 1.0,
                "base": "USD",
                "rates": {
                    "2026-09-21": {"KRW": 1372.18},
                    "2026-09-22": {"KRW": 1356.15},
                    "2026-09-23": {"KRW": 1360.0},
                },
            },
        )
    )
    with httpx.Client() as c:
        pts = list(ecb.usd_krw(c, "https://api.frankfurter.dev/v1", Pacer(1000), date(2026, 9, 20), NOW))
    # 09-23 값은 다음 날 00:00 UTC 에야 쓸 수 있다 — NOW(09-23 06:00) 에는 없다
    assert [p.value for p in pts] == [1372.18, 1356.15]
    assert pts[0].observed_at == datetime(2026, 9, 21, tzinfo=UTC)
    assert pts[0].available_at == datetime(2026, 9, 22, tzinfo=UTC)
    assert {p.series_id for p in pts} == {"USDKRW"}


@respx.mock
def test_fear_greed_history_lag_and_zero_kept() -> None:
    d = int(datetime(2026, 9, 22, tzinfo=UTC).timestamp())
    respx.get("https://api.alternative.me/fng/").mock(
        return_value=httpx.Response(
            200,
            json={
                "data": [
                    {"value": "0", "timestamp": str(d)},
                    {"value": "71", "timestamp": str(d + 86_400)},  # 2026-09-23 00:00 → 공개 01:00
                    {"value": "150", "timestamp": str(d - 86_400)},
                ]
            },
        )
    )
    with httpx.Client() as c:
        pts = list(fear_greed.history(c, "https://api.alternative.me", Pacer(1000), NOW))
    # 0 은 극단 공포로 남고(서버 원문의 falsy 버그를 여기서 되풀이하지 않는다), 범위 밖 150 은 버린다
    assert [p.value for p in pts] == [0.0, 71.0]
    assert pts[1].available_at == datetime(2026, 9, 23, 1, tzinfo=UTC)

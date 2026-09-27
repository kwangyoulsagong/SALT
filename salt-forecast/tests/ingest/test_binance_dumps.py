import hashlib
import io
import zipfile
from datetime import UTC, date, datetime

import httpx
import pytest
import respx

from salt_forecast.domain.flow import net_ratio, whale_contribution
from salt_forecast.ingest import binance_dumps
from salt_forecast.ingest.http import SourceError

URL = "https://data.binance.vision/data/spot/daily/aggTrades/BTCUSDT/BTCUSDT-aggTrades-2026-09-20.zip"
CSV = (
    b"1,50000.0,1.0,1,1,1789862400240264,False,True\n"  # 5만 달러 테이커 매수
    b"2,50000.0,0.5,2,2,1789862400240265,True,True\n"  # 2.5만 — 문턱 아래
    b"3,40000.0,1.0,3,3,1789862400240266,True,True\n"  # 4만 테이커 매도
)


def _zip(body: bytes) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("BTCUSDT-aggTrades-2026-09-20.csv", body)
    return buf.getvalue()


@respx.mock
def test_daily_flow_threshold_side_and_checksum() -> None:
    blob = _zip(CSV)
    respx.get(URL).mock(return_value=httpx.Response(200, content=blob))
    respx.get(URL + ".CHECKSUM").mock(
        return_value=httpx.Response(200, content=f"{hashlib.sha256(blob).hexdigest()}  x.zip".encode())
    )
    with httpx.Client() as c:
        flow = binance_dumps.daily_flow(c, "https://data.binance.vision", "BTCUSDT", date(2026, 9, 20))
    assert flow is not None
    assert (flow.buy_usd, flow.sell_usd, flow.n_buy, flow.n_sell) == (50000.0, 40000.0, 1, 1)
    pts = binance_dumps.points("BTC", date(2026, 9, 20), flow)
    assert pts[0].available_at == datetime(2026, 9, 21, tzinfo=UTC)  # 그날 마감에 안다


@respx.mock
def test_checksum_mismatch_fails_and_404_is_none() -> None:
    respx.get(URL).mock(return_value=httpx.Response(200, content=_zip(CSV)))
    respx.get(URL + ".CHECKSUM").mock(return_value=httpx.Response(200, content=b"deadbeef  x.zip"))
    with httpx.Client() as c, pytest.raises(SourceError):
        binance_dumps.daily_flow(c, "https://data.binance.vision", "BTCUSDT", date(2026, 9, 20))
    respx.get(URL.replace("2026-09-20", "2026-09-21")).mock(return_value=httpx.Response(404))
    with httpx.Client() as c:
        assert binance_dumps.daily_flow(c, "https://data.binance.vision", "BTCUSDT", date(2026, 9, 21)) is None


def test_header_row_is_skipped() -> None:
    flow = binance_dumps.parse_flow(b"agg_trade_id,price,quantity,f,l,transact_time,is_buyer_maker,m\n" + CSV)
    assert flow.n_buy == 1 and flow.n_sell == 1


def test_rule_threshold_and_net_ratio() -> None:
    assert whale_contribution(121.0, 100.0) == 8.0 and whale_contribution(120.0, 100.0) == 0.0
    assert whale_contribution(0.0, 0.0) == 0.0
    assert net_ratio(3.0, 1.0) == 0.5
    assert net_ratio(0.0, 0.0) != net_ratio(0.0, 0.0)  # NaN — 균형 0 과 다르다

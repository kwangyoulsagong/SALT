import json
from datetime import UTC, datetime
from pathlib import Path

import httpx
import respx

from salt_forecast.ingest import deribit
from salt_forecast.ingest.http import Pacer

FIX = Path(__file__).parent / "fixtures" / "deribit"
URL = "https://www.deribit.com/api/v2/public/get_volatility_index_data"


@respx.mock
def test_dvol_available_after_bar_closes_and_drops_bad_and_open_bars() -> None:
    body = json.loads((FIX / "dvol_btc.json").read_text())
    respx.get(URL).mock(return_value=httpx.Response(200, json=body))
    # 두 번째 봉(03-25)은 03-26 00:00 에 닫힌다 — now 가 그 직전이면 아직 모른다
    now = datetime(2021, 3, 25, 23, 59, tzinfo=UTC)
    with httpx.Client() as c:
        pts = list(deribit.dvol(c, "https://www.deribit.com/api/v2", Pacer(1000), "BTC", deribit.HISTORY_START, now))
    assert [p.value for p in pts] == [95.04]
    assert pts[0].observed_at == datetime(2021, 3, 24, tzinfo=UTC)
    assert pts[0].available_at == datetime(2021, 3, 25, tzinfo=UTC)
    assert pts[0].series_id == "dvol:BTC"


@respx.mock
def test_dvol_chunks_do_not_duplicate_points() -> None:
    body = json.loads((FIX / "dvol_btc.json").read_text())
    route = respx.get(URL).mock(return_value=httpx.Response(200, json=body))
    now = datetime(2022, 12, 1, tzinfo=UTC)
    with httpx.Client() as c:
        pts = list(deribit.dvol(c, "https://www.deribit.com/api/v2", Pacer(1000), "BTC", deribit.HISTORY_START, now))
    # 청크 두 번이 같은 응답을 받아도 각 청크 구간 밖 봉은 버린다 — 점이 겹치지 않는다
    assert route.call_count == 2
    assert [p.value for p in pts] == [95.04, 89.74]  # 0 은 원천 오류로 버린다

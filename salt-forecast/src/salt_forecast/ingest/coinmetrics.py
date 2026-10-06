"""Coin Metrics Community API — BTC 온체인 일 지표. 키 없음 · 조회만 · CC BY-NC 4.0(FC-REQ-015).

`timeseries/asset-metrics` 의 행 시각 `time` 은 그날(UTC) 00:00 이고 값은 그날 끝까지의 체인 상태다.
게시 시각이 응답에 없어서 available_at = time + 2일(그날이 닫히는 +1일 + 게시 지연 상한 1일, 보수적 —
사전등록 onchain-regime@1 [data]).

거래소 입출금(`FlowInExNtv` · `FlowOutExNtv`)은 원천이 거래소 주소 라벨을 소급 적용하고 최근 값(status = flash)을
나중에 고친다. 그래서 증분은 **마지막 관측 다음 날부터만** 받는다 — 이미 받은 날을 다시 받아 덮지 않는다
(처음 본 값이 그 시점에 알던 값).

카탈로그에서 무료(community)로 확인한 메트릭만 부른다. 하나라도 막히면 원천이 403 을 준다 — 실패로 기록한다.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import httpx
from pydantic import BaseModel, ConfigDict

from salt_forecast.ingest.http import Pacer, SourceError, get_json
from salt_forecast.store.series import SeriesPoint

SOURCE = "coinmetrics"
ASSET = "btc"
# 메트릭 → 단위. 카탈로그 2026-10-06 확인(community = true) — CapRealUSD · NVTAdj 는 막혀 있다
METRICS = {
    "CapMVRVCur": "ratio",
    "FlowInExNtv": "btc",
    "FlowOutExNtv": "btc",
    "AdrActCnt": "count",
    "HashRate": "th_per_s",
}
LAG = timedelta(days=2)
PAGE_SIZE = 10000
MAX_PAGES = 20
# 판정 지표 MVRV 이력 시작(2010-07-18) 앞 — 여기서부터 부르면 전체 이력이다
HISTORY_START = datetime(2010, 7, 1, tzinfo=UTC)


def series_id(metric: str, asset: str = ASSET) -> str:
    return f"cm:{asset}:{metric}"


class _Body(BaseModel):
    model_config = ConfigDict(extra="ignore")

    # 행은 {"asset", "time", <메트릭>: "숫자 문자열", <메트릭>-status: ...} — 메트릭 키가 가변이라 dict 로 받는다
    data: list[dict[str, str | None]]
    next_page_token: str | None = None


def _parse_time(raw: str) -> datetime:
    # "2026-10-05T00:00:00.000000000Z" — 나노초는 파이썬이 못 읽는다. 일 단위라 날짜만 쓴다
    return datetime.strptime(raw[:10], "%Y-%m-%d").replace(tzinfo=UTC)


def daily(
    client: httpx.Client, base_url: str, pacer: Pacer, since: dict[str, datetime], now: datetime
) -> Iterator[SeriesPoint]:
    """메트릭별로 observed > since[메트릭] 인 날만. since 에 없는 메트릭은 전체 이력.

    available_at > now 인 날은 아직 모른다 — 버린다.
    """
    url = f"{base_url.rstrip('/')}/timeseries/asset-metrics"
    start = min((since.get(series_id(m), HISTORY_START) for m in METRICS), default=HISTORY_START)
    params: dict[str, str | int] = {
        "assets": ASSET,
        "metrics": ",".join(METRICS),
        "frequency": "1d",
        "start_time": start.date().isoformat(),
        "paging_from": "start",
        "page_size": PAGE_SIZE,
    }
    for _ in range(MAX_PAGES):
        body = get_json(client, url, params, pacer, label=f"coinmetrics:{ASSET}")
        try:
            page = _Body.model_validate(body)
        except ValueError as e:
            raise SourceError("coinmetrics 응답 모양이 다르다", retryable=False) from e
        for row in page.data:
            t = row.get("time")
            if t is None:
                continue
            observed = _parse_time(t)
            available = observed + LAG
            if available > now:
                continue
            for metric, unit in METRICS.items():
                sid = series_id(metric)
                raw = row.get(metric)
                if raw is None or observed <= since.get(sid, HISTORY_START - timedelta(days=1)):
                    continue
                value = float(raw)
                if value < 0 or (metric == "CapMVRVCur" and value == 0):
                    continue  # 음수 · MVRV 0 은 원천 오류 — 버린다(입출금 0 은 유효하다)
                yield SeriesPoint(SOURCE, sid, observed, available, value, unit)
        if not page.next_page_token:
            return
        params["next_page_token"] = page.next_page_token
    raise SourceError(f"coinmetrics 페이지가 {MAX_PAGES} 장을 넘는다", retryable=False)

"""한국은행 ECOS — 소비자물가지수(901Y009 총지수, 월). 키 필요(FORECAST_ECOS_API_KEY) · 조회만 (FC-REQ-024 FR-6).

FRED 의 한국 CPI 는 2023-11 에서 멈췄다(2026-11-18 확인) — 공식 원천을 직접 받는다. 응답에 발표 시각이 없어
available_at 은 domain/price_index 가 국가데이터처 보도 시각으로 정한다. 기준 연도(UNIT_NAME `2020=100`)가 바뀌면
과거 전체가 새 기준으로 다시 나온다 — 시리즈를 통째로 바꾼다(store `replace_series`).
키는 URL 경로에 들어간다 — 오류 메시지 · 로그에 URL 을 싣지 않는다(get_json 이 label 만 쓴다).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime

import httpx
from pydantic import BaseModel

from salt_forecast.domain.price_index import available_at, month_observed
from salt_forecast.ingest.http import Pacer, SourceError, get_json
from salt_forecast.store.series import SeriesPoint

SOURCE = "ecos"
SERIES = "kr_cpi_total"
STAT_CODE = "901Y009"
ITEM_CODE = "0"  # 총지수
FIRST_MONTH = "196501"
# 한 번에 받을 행 상한 — 1965-01 부터 월 약 750행. 넘으면 다음 쪽
PAGE = 1000
NO_DATA = "INFO-200"


class _Row(BaseModel):
    TIME: str
    DATA_VALUE: str
    UNIT_NAME: str
    ITEM_CODE1: str


class _Search(BaseModel):
    list_total_count: int
    row: list[_Row]


@dataclass(frozen=True, slots=True)
class IndexMonth:
    month: date
    value: float
    base: str


def parse(raw: object) -> tuple[int, list[IndexMonth]]:
    """(전체 행 수, 이 쪽의 달들). 자료 없음(INFO-200)은 빈 목록, 다른 RESULT 는 키 · 한도 오류다."""
    if isinstance(raw, dict) and "RESULT" in raw:
        result = raw["RESULT"]  # pyright: ignore[reportUnknownVariableType]
        code = str(result.get("CODE", "")) if isinstance(result, dict) else ""  # pyright: ignore[reportUnknownMemberType,reportUnknownArgumentType]
        if code == NO_DATA:
            return 0, []
        raise SourceError(f"ecos {code or 'RESULT'}", retryable=False)
    if not isinstance(raw, dict) or "StatisticSearch" not in raw:
        raise SourceError("ecos 응답 모양", retryable=False)
    body = _Search.model_validate(raw["StatisticSearch"])
    out: list[IndexMonth] = []
    for r in body.row:
        if r.ITEM_CODE1 != ITEM_CODE or len(r.TIME) != 6:
            continue
        value = float(r.DATA_VALUE)
        if value <= 0:
            raise SourceError(f"ecos 지수 {r.TIME} 0 이하", retryable=False)
        out.append(IndexMonth(date(int(r.TIME[:4]), int(r.TIME[4:]), 1), value, r.UNIT_NAME))
    return body.list_total_count, out


def cpi_months(client: httpx.Client, base_url: str, key: str, pacer: Pacer, until: date) -> list[IndexMonth]:
    """1965-01 부터 `until` 달까지 전부. 기준이 섞여 오면(개편 도중) 실패로 — 섞인 시리즈를 저장하지 않는다."""
    end = f"{until.year}{until.month:02d}"
    months: list[IndexMonth] = []
    start = 1
    while True:
        url = (
            f"{base_url.rstrip('/')}/StatisticSearch/{key}/json/kr/{start}/{start + PAGE - 1}"
            f"/{STAT_CODE}/M/{FIRST_MONTH}/{end}/{ITEM_CODE}"
        )
        total, page = parse(get_json(client, url, {}, pacer, label="ecos"))
        months.extend(page)
        start += PAGE
        if not page or start > total:
            break
    bases = {m.base for m in months}
    if len(bases) > 1:
        raise SourceError(f"ecos 기준 섞임 {sorted(bases)}", retryable=True)
    return sorted(months, key=lambda m: m.month)


def to_points(months: Sequence[IndexMonth], releases: Sequence[datetime], now: datetime) -> list[SeriesPoint]:
    """아직 발표 전으로 보이는 달(available_at > now)은 뺀다 — 보도 표와 원천이 어긋나도 미래 행 0."""
    out: list[SeriesPoint] = []
    for m in months:
        avail = available_at(m.month, releases)
        if avail > now:
            continue
        out.append(SeriesPoint(SOURCE, SERIES, month_observed(m.month), avail, m.value, m.base))
    return out

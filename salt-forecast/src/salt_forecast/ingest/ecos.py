"""한국은행 ECOS — 소비자물가지수(901Y009 총지수, 월 — FC-REQ-024 FR-6) · 코스피 PER · 배당수익률(901Y014, 월) ·
코스피 지수(802Y001, 일 — FC-REQ-029). 키 필요(FORECAST_ECOS_API_KEY) · 조회만.

FRED 의 한국 CPI 는 2023-11 에서 멈췄다(2026-11-18 확인) — 공식 원천을 직접 받는다. 응답에 발표 시각이 없어
available_at 은 domain/price_index 가 국가데이터처 보도 시각으로 정한다. 기준 연도(UNIT_NAME `2020=100`)가 바뀌면
과거 전체가 새 기준으로 다시 나온다 — 시리즈를 통째로 바꾼다(store `replace_series`).
키는 URL 경로에 들어간다 — 오류 메시지 · 로그에 URL 을 싣지 않는다(get_json 이 label 만 쓴다).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

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


# ── 코스피 밸류에이션(FC-REQ-029 · 사전등록 band-accumulation@1) ──────────────────────────────

MARKET_MONTHLY = "901Y014"
MARKET_DAILY = "802Y001"
KOSPI_PER = "kr_kospi_per"
KOSPI_DIVIDEND_YIELD = "kr_kospi_dividend_yield"
KOSPI_INDEX = "kr_kospi_index"
# (시리즈, 통계표, 주기, 항목, 시작, 단위)
KOSPI_SERIES: tuple[tuple[str, str, str, str, str, str], ...] = (
    (KOSPI_PER, MARKET_MONTHLY, "M", "1110000", "200401", "ratio"),
    (KOSPI_DIVIDEND_YIELD, MARKET_MONTHLY, "M", "1100000", "200401", "pct"),
    (KOSPI_INDEX, MARKET_DAILY, "D", "0001000", "19950103", "index"),
)
# 월값 발표 시각이 응답에 없다 — 그 달 말일 + 50일(2026-11-19 에 2026-09 가 보이고 10월은 없다).
# 일값은 다음 날 00:00 UTC(09:00 KST)
MONTHLY_LAG_DAYS = 50
DAILY_LAG = timedelta(days=1)


class _AnyRow(BaseModel):
    TIME: str
    DATA_VALUE: str
    ITEM_CODE1: str


class _AnySearch(BaseModel):
    list_total_count: int
    row: list[_AnyRow]


def parse_rows(raw: object, item: str) -> tuple[int, list[tuple[str, float]]]:
    """(전체 행 수, [(TIME, 값)]). 자료 없음은 빈 목록 · 다른 RESULT 는 키 · 한도 오류. 빈 값('')은 버린다(휴장 등)."""
    if isinstance(raw, dict) and "RESULT" in raw:
        result = raw["RESULT"]  # pyright: ignore[reportUnknownVariableType]
        code = str(result.get("CODE", "")) if isinstance(result, dict) else ""  # pyright: ignore[reportUnknownMemberType,reportUnknownArgumentType]
        if code == NO_DATA:
            return 0, []
        raise SourceError(f"ecos {code or 'RESULT'}", retryable=False)
    if not isinstance(raw, dict) or "StatisticSearch" not in raw:
        raise SourceError("ecos 응답 모양", retryable=False)
    body = _AnySearch.model_validate(raw["StatisticSearch"])
    out: list[tuple[str, float]] = []
    for r in body.row:
        if item != r.ITEM_CODE1 or r.DATA_VALUE.strip() == "":
            continue
        value = float(r.DATA_VALUE)
        if value <= 0:
            raise SourceError(f"ecos {item} {r.TIME} 0 이하", retryable=False)
        out.append((r.TIME, value))
    return body.list_total_count, out


def observed_of(time: str) -> datetime:
    """`YYYYMM` → 그 달 1일 00:00 UTC, `YYYYMMDD` → 그날 00:00 UTC."""
    if len(time) == 6:
        return datetime(int(time[:4]), int(time[4:]), 1, tzinfo=UTC)
    if len(time) == 8:
        return datetime(int(time[:4]), int(time[4:6]), int(time[6:]), tzinfo=UTC)
    raise SourceError(f"ecos 시각 모양 {time}", retryable=False)


def available_of(observed: datetime, cycle: str) -> datetime:
    if cycle == "M":
        nxt = datetime(observed.year + (observed.month == 12), observed.month % 12 + 1, 1, tzinfo=UTC)
        return nxt - timedelta(days=1) + timedelta(days=MONTHLY_LAG_DAYS)
    return observed + DAILY_LAG


def kospi_points(client: httpx.Client, base_url: str, key: str, pacer: Pacer, now: datetime) -> list[SeriesPoint]:
    """세 시리즈 전부 처음부터. 아직 알 수 없는 점(available_at > now)은 뺀다. 정정은 통째 교체(replace_series)로."""
    out: list[SeriesPoint] = []
    for series, stat, cycle, item, first, unit in KOSPI_SERIES:
        end = f"{now.year}{now.month:02d}" if cycle == "M" else now.strftime("%Y%m%d")
        start = 1
        while True:
            url = (
                f"{base_url.rstrip('/')}/StatisticSearch/{key}/json/kr/{start}/{start + PAGE * 10 - 1}"
                f"/{stat}/{cycle}/{first}/{end}/{item}"
            )
            total, page = parse_rows(get_json(client, url, {}, pacer, label="ecos"), item)
            for time, value in page:
                obs = observed_of(time)
                avail = available_of(obs, cycle)
                if avail <= now:
                    out.append(SeriesPoint(SOURCE, series, obs, avail, value, unit))
            start += PAGE * 10
            if not page or start > total:
                break
    return out

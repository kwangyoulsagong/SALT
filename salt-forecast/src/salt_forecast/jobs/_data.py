"""작업이 쓰는 데이터 한 번에 읽기 — 루프 안에서 DB 를 부르지 않는다(performance.md §2)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np
from sqlalchemy import Engine

from salt_forecast.domain.calendar import KRX_CLOSE_AVAILABLE, KrxSessions, krx_session, presumed_weekdays
from salt_forecast.domain.kr_breaks import with_breaks
from salt_forecast.domain.series import CloseSeries, OhlcvSeries
from salt_forecast.features.build import MarketContext
from salt_forecast.ingest import krx_daily
from salt_forecast.jobs._common import logger
from salt_forecast.store.kr_stock import krx_open_dates
from salt_forecast.store.prices import load_close_series, load_ohlcv_series
from salt_forecast.store.series import load_vintaged

KST = timezone(timedelta(hours=9))


def load(engine: Engine, now: datetime, symbols: list[str] | None) -> tuple[dict[str, CloseSeries], MarketContext]:
    t = int(now.timestamp())
    series = {s: c.as_of(t) for s, c in load_close_series(engine, "upbit", "1d", symbols).items()}
    ctx = MarketContext(
        series=load_vintaged(engine),
        spot_usdt={s: c.as_of(t) for s, c in load_close_series(engine, "binance", "1d").items()},
        ohlcv={s: b.as_of(t) for s, b in load_ohlcv_series(engine, "upbit", "1d", symbols).items()},
    )
    return series, ctx


def load_kr_bars(engine: Engine, now: datetime) -> dict[str, OhlcvSeries]:
    """국내 주식 OHLCV(거래대금 = 종가 × 거래량) — 시점 고정 유니버스(FC-REQ-020 FR-7)."""
    t = int(now.timestamp())
    return {s: b.as_of(t) for s, b in load_ohlcv_series(engine, krx_daily.SOURCE, krx_daily.INTERVAL).items()}


def load_kr(engine: Engine, now: datetime) -> tuple[dict[str, CloseSeries], KrxSessions]:
    """국내 주식 종가(`kis` 1d) + 거래일 달력. 달력 = 서버 개장일 ∪ 일봉이 있는 날 — 둘 중 하나만 알아도 거래일이다."""
    t = int(now.timestamp())
    series = {
        s: with_breaks(c.as_of(t)) for s, c in load_close_series(engine, krx_daily.SOURCE, krx_daily.INTERVAL).items()
    }
    sessions = {int(x) - KRX_CLOSE_AVAILABLE for c in series.values() for x in c.available_at}
    sessions |= {krx_session(d) for d in krx_open_dates(engine)}
    # 원천이 멈춘 뒤의 평일은 거래일로 가정 — 멈춘 가격을 신선하다고 읽지 않게(presumed_weekdays)
    presumed = presumed_weekdays(sessions, now.astimezone(KST).date())
    if presumed:
        logger("kr_calendar").warning(
            "달력 원천이 멈췄다 — 평일을 거래일로 가정",
            extra={"fields": {"from": str(presumed[0]), "to": str(presumed[-1]), "days": len(presumed)}},
        )
    sessions |= {krx_session(d) for d in presumed}
    return series, KrxSessions(np.asarray(sorted(sessions), dtype=np.int64))

"""등락 분해 β · σ 읽기 · 쓰기 (FC-REQ-027 FR-1~3).

읽기: 서버가 KIS 에서 받은 지수 · 업종 일별(`public.kr_sector_index_daily`) · 종목 마스터(`public.kr_stock_master`) —
**읽기만**(db-contract.md §1).
쓰기: `forecast.move_beta`. 서버는 `forecast.v_move_beta_export` 뷰로 읽는다.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np
from sqlalchemy import Engine, text

from salt_forecast.domain.calendar import KRX_CLOSE_AVAILABLE, krx_session
from salt_forecast.domain.move_beta import KR_MARKET_INDEX, MoveBeta, kr_sector_index_code
from salt_forecast.domain.series import CloseSeries
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import move_beta


def kr_index_daily(engine: Engine) -> dict[str, CloseSeries]:
    """지수 · 업종 일별 종가 — available_at = 그 거래일 종가를 아는 시각(16:00 KST, 국내 일봉과 같은 관례). 시점
    자르기는 호출자가 `as_of`."""
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT code, trade_date, close FROM public.kr_sector_index_daily ORDER BY code, trade_date")
        ).all()
    grouped: dict[str, tuple[list[int], list[float]]] = {}
    for code, d, close in rows:
        t, v = grouped.setdefault(str(code), ([], []))
        t.append(krx_session(d) + KRX_CLOSE_AVAILABLE)
        v.append(float(close))
    return {
        c: CloseSeries(c, np.asarray(t, dtype=np.int64), np.asarray(v, dtype=np.float64))
        for c, (t, v) in grouped.items()
    }


@dataclass(frozen=True, slots=True)
class KrIndexMembership:
    market_index: str | None
    sector_index: str | None


def kr_index_membership(engine: Engine) -> dict[str, KrIndexMembership]:
    """종목 → 소속 시장 지수 · 업종 지수. 마스터가 하루 한 번 갱신하는 지금 값이다 — 시장 · 업종 이동은 드물고(이전
    상장), 과거 as_of 로
    다시 돌리면 지금 소속으로 계산된다(kr_status 와 같은 한계 — 상태 이력이 없다)."""
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT code, market, sector_code, sector_mid_code FROM public.kr_stock_master")).all()
    return {
        str(code): KrIndexMembership(KR_MARKET_INDEX.get(str(market)), kr_sector_index_code(sector, mid))
        for code, market, sector, mid in rows
    }


def btc_betas_as_of(engine: Engine, as_of: datetime) -> dict[str, float | None]:
    """종목별 `realized_vol.btc_beta` — as_of 이하 최신 행(FC-REQ-010). 새 계산 0."""
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT DISTINCT ON (symbol) symbol, btc_beta FROM forecast.realized_vol"
                " WHERE as_of <= :as_of ORDER BY symbol, as_of DESC"
            ),
            {"as_of": as_of},
        ).all()
    return {str(s): (float(b) if b is not None else None) for s, b in rows}


@dataclass(frozen=True, slots=True)
class MoveBetaRow:
    value: MoveBeta
    asset_class: str
    market_index: str | None
    sector_index: str | None


_COLS = (
    "symbol",
    "as_of",
    "asset_class",
    "market_index",
    "sector_index",
    "beta_market",
    "beta_sector",
    "beta_sample",
    "sigma_daily",
    "sigma_sample",
    "last_bar_at",
    "computed_at",
)


def upsert_move_betas(engine: Engine, rows: Iterable[MoveBetaRow], as_of: datetime, now: datetime) -> int:
    out = [
        (
            r.value.symbol,
            as_of,
            r.asset_class,
            r.market_index,
            r.sector_index,
            r.value.beta_market,
            r.value.beta_sector,
            r.value.beta_sample,
            r.value.sigma_daily,
            r.value.sigma_sample,
            datetime.fromtimestamp(r.value.last_bar_at, tz=UTC) if r.value.last_bar_at is not None else None,
            now,
        )
        for r in rows
    ]
    return bulk_upsert(engine, move_beta, _COLS, out, ("symbol", "as_of"))

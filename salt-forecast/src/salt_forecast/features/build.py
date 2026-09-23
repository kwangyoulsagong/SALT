"""피처 행렬 — as_of 하나에서 종목 전체의 피처를 만든다. 모든 조회가 as_of 를 필수로 받는다(time-and-leakage.md §2).

학습과 예측이 이 함수 하나를 쓴다(architecture.md §1 — models → features 만 허용되는 이유).
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.domain.features import (
    PRICE_FEATURES,
    cross_sectional_rank,
    diff,
    log_change,
    price_features,
)
from salt_forecast.domain.series import DAY, CloseSeries

MACRO = {
    "mac_dff": ("DFF", "level"),
    "mac_dgs10_chg_4w": ("DGS10", "diff"),
    "mac_curve_10y_2y": ("DGS10-DGS2", "spread"),
    "mac_dollar_chg_4w": ("DTWEXBGS", "log"),
    "mac_krw_chg_4w": ("DEXKOUS", "log"),
    "mac_nasdaq_ret_4w": ("NASDAQCOM", "log"),
    "mac_vix": ("VIXCLS", "level"),
    "stc_supply_chg_4w": ("stablecoins_total_usd", "log"),
}
FEATURES: tuple[str, ...] = (
    *PRICE_FEATURES,
    "xs_rank_ret_4w",
    "xs_rank_vol_4w",
    "btc_ret_4w",
    "fund_mean_7d",
    "fund_mean_30d",
    "kimchi_premium",
    *MACRO.keys(),
)


@dataclass(frozen=True, slots=True)
class MarketContext:
    """피처에 필요한 시장 · 거시 데이터 전체(메모리). 조회는 전부 as_of 로."""

    series: Mapping[str, VintagedSeries]  # FRED · DefiLlama · 바이낸스 펀딩비
    spot_usdt: Mapping[str, CloseSeries]  # 바이낸스 현물 BASEUSDT


def _macro(ctx: MarketContext, as_of: int) -> dict[str, float]:
    out: dict[str, float] = {}
    cut = as_of - 28 * DAY
    for name, (sid, kind) in MACRO.items():
        if kind == "spread":
            a, b = ctx.series.get("DGS10"), ctx.series.get("DGS2")
            out[name] = diff(a.value_as_of(as_of) if a else None, b.value_as_of(as_of) if b else None)
            continue
        s = ctx.series.get(sid)
        now = s.value_as_of(as_of) if s else None
        if kind == "level":
            out[name] = float("nan") if now is None else now
        else:
            before = s.value_as_of(as_of, cutoff=cut) if s else None
            out[name] = diff(now, before) if kind == "diff" else log_change(now, before)
    return out


def _funding_mean(ctx: MarketContext, base: str, as_of: int, days: int) -> float:
    s = ctx.series.get(f"funding:{base}")
    if s is None:
        return float("nan")
    mask = (s.available <= as_of) & (s.observed > as_of - days * DAY)
    return float(np.mean(s.value[mask])) if mask.any() else float("nan")


def _kimchi(ctx: MarketContext, base: str, krw_close: float | None, as_of: int) -> float:
    spot = ctx.spot_usdt.get(f"{base}USDT")
    fx = ctx.series.get("DEXKOUS")
    usd = spot.close_at_or_before(as_of) if spot else None
    krw_per_usd = fx.value_as_of(as_of) if fx else None
    if krw_close is None or usd is None or krw_per_usd is None:
        return float("nan")
    return krw_close / (usd * krw_per_usd) - 1.0


def feature_matrix(
    sliced: Mapping[str, CloseSeries], ctx: MarketContext, as_of: int
) -> tuple[list[str], NDArray[np.float64]]:
    """sliced 는 as_of 로 잘린 업비트 종가. 행 = 종목, 열 = FEATURES."""
    symbols = sorted(sliced)
    rows = {s: price_features(sliced[s], as_of) for s in symbols}
    rank_ret = cross_sectional_rank({s: rows[s]["px_ret_4w"] for s in symbols})
    rank_vol = cross_sectional_rank({s: rows[s]["px_vol_4w"] for s in symbols})
    btc = rows.get("KRW-BTC", {}).get("px_ret_4w", float("nan"))
    macro = _macro(ctx, as_of)
    matrix = np.full((len(symbols), len(FEATURES)), np.nan, dtype=np.float64)
    for i, s in enumerate(symbols):
        base = s.removeprefix("KRW-")
        f = rows[s] | macro
        f["xs_rank_ret_4w"], f["xs_rank_vol_4w"], f["btc_ret_4w"] = rank_ret[s], rank_vol[s], btc
        f["fund_mean_7d"] = _funding_mean(ctx, base, as_of, 7)
        f["fund_mean_30d"] = _funding_mean(ctx, base, as_of, 30)
        f["kimchi_premium"] = _kimchi(ctx, base, sliced[s].last_close(), as_of)
        matrix[i] = [f[name] for name in FEATURES]
    return symbols, matrix

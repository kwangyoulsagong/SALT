"""등락 분해 β · 평소 변동 σ (F016 단계 C · FC-REQ-027 FR-1~3).

서버가 오늘 등락을 시장 · 업종 · 종목 몫으로 나눌 때 쓰는 β 와, 카드 조건(|등락| ≥ k × σ)의 σ 를 낸다.
**이 값은 채점하는 예측이 아니다** — 지난 자료를 요약한 계수(분해의 가중치)다.
화면은 "시장 몫 −3.1%p"처럼 오늘 사실에 곱한 결과만 보인다.

- 국내: 종목 일간 로그수익률 = a + β_시장 × 지수 + β_업종 × (업종 − 지수) + e — 업종이 없으면 시장 한 요인
- 시점 고정: 모든 시계열은 `CloseSeries.as_of` 를 거친 뒤 들어온다(time-and-leakage.md §2). 이 모듈은 받은 것만 쓴다
- 원천 끊김(`kr_breaks`)을 건너는 수익률은 쓰지 않는다 — 병합 ×5 가 β 를 끌지 않게
- 표본이 모자라면 None — 서버가 β=1(시장 조정)로 한다. 0 으로 두면 "시장과 무관"으로 읽힌다
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import pairwise

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.series import CloseSeries


@dataclass(frozen=True, slots=True)
class MoveBetaWindow:
    """창 · 최소 표본 — 설정(`Settings.move_*`)에서 온다."""

    beta_window: int = 120
    beta_min_sample: int = 60
    sigma_window: int = 60
    sigma_min_sample: int = 40

    def __post_init__(self) -> None:
        if not (0 < self.beta_min_sample <= self.beta_window and 0 < self.sigma_min_sample <= self.sigma_window):
            raise ValueError("최소 표본은 1 이상 · 창 이하")


@dataclass(frozen=True, slots=True)
class MoveBeta:
    symbol: str
    beta_market: float | None
    beta_sector: float | None
    beta_sample: int
    sigma_daily: float | None
    sigma_sample: int
    last_bar_at: int | None


def _returns_on(series: CloseSeries, at: NDArray[np.int64]) -> tuple[NDArray[np.int64], NDArray[np.float64]]:
    """`at`(오름차순) 시각들의 종가로 이웃한 두 시각 사이 로그수익률 — 끝 시각 · 값. 끊김을 건너는 구간은 뺀다."""
    idx = np.searchsorted(series.available_at, at)
    close = series.close[idx]
    ends = at[1:]
    rets = np.log(close[1:] / close[:-1])
    if series.breaks.size:
        keep = np.array([not series.crosses_break(int(a), int(b)) for a, b in pairwise(at)], dtype=bool)
        return ends[keep], rets[keep]
    return ends, rets


def _common(*series: CloseSeries) -> NDArray[np.int64]:
    out = series[0].available_at
    for s in series[1:]:
        out = np.intersect1d(out, s.available_at, assume_unique=True)
    return out


def regression_betas(
    stock: CloseSeries, market: CloseSeries, sector: CloseSeries | None, window: MoveBetaWindow
) -> tuple[float | None, float | None, int]:
    """(β_시장, β_업종, 표본 수). 세 시계열이 모두 종가를 가진 날만 쓴다(정지일 · 지수 결측일은 빠진다).

    업종 시계열이 있어도 공통 표본이 모자라면 시장 한 요인으로 다시 맞춘다 — 업종 이력이 짧은 동안 시장 β 까지
    버리지 않게.
    """
    candidates = ([[market, sector]] if sector is not None else []) + [[market]]
    for candidate in candidates:
        at = _common(stock, *candidate)
        if at.size < 2:
            continue
        ends, rs = _returns_on(stock, at)
        rm = _returns_on(market, at)[1]
        mask = np.isin(at[1:], ends)
        rm = rm[mask]
        cols = [np.ones_like(rs), rm]
        if len(candidate) == 2:
            rsec = _returns_on(candidate[1], at)[1][mask]
            cols.append(rsec - rm)
        x = np.column_stack(cols)[-window.beta_window :]
        y = rs[-window.beta_window :]
        n = int(y.size)
        if n < window.beta_min_sample:
            continue
        coef, *_ = np.linalg.lstsq(x, y, rcond=None)
        return float(coef[1]), (float(coef[2]) if len(candidate) == 2 else None), n
    return None, None, 0


def daily_sigma(series: CloseSeries, window: MoveBetaWindow) -> tuple[float | None, int]:
    """지난 `sigma_window` 개 일간 **단순**수익률의 표본 표준편차(비율) — 서버 등락률(%)과 같은 척도. 끊김을 건너는
    날은 뺀다."""
    if series.available_at.size < 2:
        return None, 0
    ends, logs = _returns_on(series, series.available_at)
    del ends
    simple = np.expm1(logs)[-window.sigma_window :]
    n = int(simple.size)
    if n < window.sigma_min_sample:
        return None, n
    return float(np.std(simple, ddof=1)), n


def kr_move_beta(
    stock: CloseSeries, market: CloseSeries | None, sector: CloseSeries | None, window: MoveBetaWindow
) -> MoveBeta:
    beta_m, beta_s, n = regression_betas(stock, market, sector, window) if market is not None else (None, None, 0)
    sigma, sn = daily_sigma(stock, window)
    return MoveBeta(stock.symbol, beta_m, beta_s, n, sigma, sn, stock.last_at())


def crypto_move_beta(series: CloseSeries, btc_beta: float | None, window: MoveBetaWindow) -> MoveBeta:
    """코인 — β 는 `realized_vol.btc_beta`(FC-REQ-010) 를 그대로 옮긴다(새 계산 0, FR-2). σ 만 여기서."""
    sigma, sn = daily_sigma(series, window)
    beta = btc_beta if btc_beta is not None and np.isfinite(btc_beta) else None
    return MoveBeta(series.symbol, beta, None, 0, sigma, sn, series.last_at())


def _valid_sector(code: str | None) -> bool:
    return code is not None and len(code) == 4 and code.isdigit() and code != "0000" and not code.endswith("001")


def kr_sector_index_code(sector_code: str | None, mid_code: str | None = None) -> str | None:
    """마스터 지수업종 → 업종 지수 코드. 서버 `krSectorIndexCodeOf` 와 같은 표 — **중분류가 있으면 중분류**(0013
    전기전자 · 0009 의약품),
    없으면 대분류. 대분류 "제조업"(0027)은 반도체가 지배해 제약사 업종 β 가 −3.5 로 나왔다(2026-11-09 dry-run).
    `0000` · `x001` 은 없음."""
    if _valid_sector(mid_code):
        return mid_code
    return sector_code if _valid_sector(sector_code) else None


KR_MARKET_INDEX = {"KOSPI": "0001", "KOSDAQ": "1001"}

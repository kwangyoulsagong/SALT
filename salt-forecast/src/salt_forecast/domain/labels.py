"""라벨 — 고정 지평 수익률 · 삼중 장벽(FC-REQ-008 FR-5 · 리서치 §6-3 1단계).

**미래를 읽는 유일한 모듈**이다(라벨이니까). 피처 코드는 이걸 import 하지 않는다.

삼중 장벽: 상단 +2σ_h · 하단 −1σ_h(로그수익률) · 수직 h일. σ_h = EWMA(λ=0.94) 일 σ × √h, σ 는 t 까지의 수익률로만.
t+1 ~ t+h 일봉의 고가 · 저가로 먼저 닿은 쪽을 본다. **같은 날 둘 다 닿으면 하단**(일봉으로는 순서를 모른다 — 보수적).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.panel import Mat, Panel, lag
from salt_forecast.domain.volatility import EWMA_LAMBDA

UPPER_SIGMA = 2.0
LOWER_SIGMA = 1.0
MIN_VOL_OBS = 20


def ewma_sigma(p: Panel, lam: float = EWMA_LAMBDA) -> Mat:
    """행 t 까지의 일 로그수익률로 만든 EWMA σ. 관측이 20개 미만이면 NaN. 결측일은 앞 값을 이어 간다."""
    with np.errstate(divide="ignore", invalid="ignore"):
        r = np.log(p.close / lag(p.close, 1))
    var = np.full_like(r, np.nan)
    count = np.zeros(r.shape[1], dtype=np.int64)
    v = np.full(r.shape[1], np.nan)
    for t in range(r.shape[0]):
        ok = ~np.isnan(r[t])
        first = ok & np.isnan(v)
        v = np.where(first, r[t] ** 2, v)
        upd = ok & ~first
        v = np.where(upd, lam * v + (1.0 - lam) * r[t] ** 2, v)
        count += ok
        var[t] = np.where(count >= MIN_VOL_OBS, v, np.nan)
    return np.sqrt(var)


@dataclass(frozen=True, slots=True)
class BarrierLabels:
    label: Mat  # +1 상단 · −1 하단 · 0 수직, NaN = 라벨 없음
    exit_return: Mat  # 장벽(또는 수직)에서의 로그수익률
    realized_r: Mat  # exit_return ÷ σ_h — 하단 폭(1σ) 단위


def triple_barrier(p: Panel, h: int, sigma: Mat | None = None) -> BarrierLabels:
    sig = ewma_sigma(p) if sigma is None else sigma
    sig_h = sig * np.sqrt(h)
    up, dn = UPPER_SIGMA * sig_h, -LOWER_SIGMA * sig_h
    base = p.close
    n = base.shape[0]
    label = np.full_like(base, np.nan)
    exit_r = np.full_like(base, np.nan)
    open_ = ~np.isnan(base) & ~np.isnan(sig_h)
    with np.errstate(divide="ignore", invalid="ignore"):
        for k in range(1, h + 1):
            hi = np.full_like(base, np.nan)
            lo = np.full_like(base, np.nan)
            hi[: n - k] = np.log(p.high[k:] / base[: n - k])
            lo[: n - k] = np.log(p.low[k:] / base[: n - k])
            hit_dn = open_ & (lo <= dn)
            hit_up = open_ & (hi >= up) & ~hit_dn
            label = np.where(hit_dn, -1.0, np.where(hit_up, 1.0, label))
            exit_r = np.where(hit_dn, dn, np.where(hit_up, up, exit_r))
            open_ &= ~(hit_dn | hit_up)
        vertical = np.full_like(base, np.nan)
        vertical[: n - h] = np.log(base[h:] / base[: n - h])
    ends = open_ & ~np.isnan(vertical)
    label = np.where(ends, 0.0, label)
    exit_r = np.where(ends, vertical, exit_r)
    # 수직 종가가 아직 없는 칸(최근 h일)은 먼저 닿았어도 버린다 — 표본 끝이 장벽 쪽으로 치우친다
    unfinished = np.isnan(vertical)
    label[unfinished] = np.nan
    exit_r[unfinished] = np.nan
    return BarrierLabels(label, exit_r, exit_r / sig_h)


def class_ratio(labels: Mat) -> tuple[float, float, float]:
    """(+1, 0, −1) 비율. 리서치 게이트: 각 20~60% 밖이면 장벽 재설정 검토."""
    v: NDArray[np.float64] = labels[~np.isnan(labels)]
    if v.size == 0:
        return (float("nan"), float("nan"), float("nan"))
    n = float(v.size)
    return (
        float(np.count_nonzero(v == 1)) / n,
        float(np.count_nonzero(v == 0)) / n,
        float(np.count_nonzero(v == -1)) / n,
    )

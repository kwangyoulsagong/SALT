"""국내 주식 척도 · 형태 — 풀링 HAR · 범위 분산 · 시장 성분 · 패널 FHS(FC-REQ-020 FR-11 · FR-12, 사전등록 `kr-scale@1`).

종목 × 거래일 행렬 하나에 일 수익률 · 범위 분산 · 시장 수익률을 깔고, 창 평균 피처를 누적합으로 한 번에 만든다
(performance.md §2 — 종목 루프 안에서 창을 다시 훑지 않는다). 피처는 거래일 i **까지의** 값만 쓴다(뒤로 보는 창).
목표(i+1 ~ i+n 거래일)는 적합에만 쓰고, 적합 행은 호출자가 "라벨이 as_of 이전에 끝난" 것만 고른다.

이 모듈은 시각을 모른다 — 거래일 위치(정수)만 다룬다. 시각 ↔ 위치는 `models/kr_scale.py` 가 한다.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.quantiles import LEVELS_ARR

Vec = NDArray[np.float64]
Mat = NDArray[np.float64]

CLOSE_WINDOWS: tuple[int, ...] = (5, 21, 63, 250)
RANGE_WINDOWS: tuple[int, ...] = (5, 21)
MARKET_WINDOW = 21
MIN_PRESENT = 0.8
VAR_FLOOR = 1e-8
LIMIT_MOVE = 0.30  # 가격제한폭 ±30% — 시장 평균에서 이보다 큰 일 수익률(액면 · 데이터 오류)은 뺀다
MARKET_MIN_TURNOVER = 1_000_000_000.0
N_BUCKETS = 3


@dataclass(frozen=True, slots=True)
class DailyPanel:
    """종목 × 거래일. 없는 날은 NaN. close 는 그날 종가(없으면 NaN), r 은 이웃 거래일 둘 다 있을 때만."""

    close: Mat
    r: Mat
    range_var: Mat
    market: Vec


def build_panel(open_: Mat, high: Mat, low: Mat, close: Mat, volume: Mat) -> DailyPanel:
    """(종목, 거래일) 행렬에서. 범위 분산 = 밤사이 ln(O/C₋₁)² + Rogers–Satchell."""
    prev = np.full_like(close, np.nan)
    prev[:, 1:] = close[:, :-1]
    with np.errstate(divide="ignore", invalid="ignore"):
        r = np.log(close / prev)
        overnight = np.log(open_ / prev) ** 2
        rs = np.log(high / close) * np.log(high / open_) + np.log(low / close) * np.log(low / open_)
        range_var = overnight + np.maximum(rs, 0.0)
        turnover = close * volume
    ok = np.isfinite(r) & (np.abs(r) <= LIMIT_MOVE) & (turnover >= MARKET_MIN_TURNOVER)
    counts = ok.sum(axis=0)
    with np.errstate(invalid="ignore"):
        market = np.where(counts > 0, np.where(ok, r, 0.0).sum(axis=0) / np.maximum(counts, 1), np.nan)
    return DailyPanel(close, r, range_var, market.astype(np.float64))


def _cum(x: Mat) -> tuple[Mat, NDArray[np.int64]]:
    """열 방향 누적합 · 누적 개수, 앞에 0 열 하나(구간 [a, b) 합 = c[b] − c[a])."""
    present = np.isfinite(x)
    lead = (x.shape[0], 1) if x.ndim == 2 else (1,)
    s = np.concatenate([np.zeros(lead), np.cumsum(np.where(present, x, 0.0), axis=-1)], axis=-1)
    n = np.concatenate([np.zeros(lead, dtype=np.int64), np.cumsum(present, axis=-1)], axis=-1)
    return s, n


def trailing_log_mean(x: Mat, window: int) -> Mat:
    """거래일 i 에서 [i − window + 1, i] 평균의 로그. 관측 < 80% 이면 NaN. 같은 모양."""
    s, n = _cum(x)
    t = x.shape[-1]
    out = np.full(x.shape, np.nan)
    if t < window:
        return out
    tot = s[..., window:] - s[..., : t + 1 - window]
    cnt = n[..., window:] - n[..., : t + 1 - window]
    with np.errstate(divide="ignore", invalid="ignore"):
        mean = np.where(cnt >= MIN_PRESENT * window, tot / np.maximum(cnt, 1), np.nan)
    out[..., window - 1 :] = np.log(np.maximum(mean, VAR_FLOOR))
    return out


def forward_log_mean(x: Mat, n_days: int) -> Mat:
    """거래일 i 에서 [i + 1, i + n] 평균의 로그(적합 목표). 관측 < 80% 거나 끝을 넘으면 NaN."""
    s, n = _cum(x)
    t = x.shape[-1]
    out = np.full(x.shape, np.nan)
    if t <= n_days:
        return out
    tot = s[..., n_days + 1 :] - s[..., 1 : t + 1 - n_days]
    cnt = n[..., n_days + 1 :] - n[..., 1 : t + 1 - n_days]
    with np.errstate(divide="ignore", invalid="ignore"):
        mean = np.where(cnt >= MIN_PRESENT * n_days, tot / np.maximum(cnt, 1), np.nan)
    out[..., : t - n_days] = np.log(np.maximum(mean, VAR_FLOOR))
    return out


def forward_log_return(close: Mat, n_days: int) -> Mat:
    """거래일 i 종가 → i + n 에 알던 마지막 종가(정지면 그 전 종가 — `close_at_or_before` 와 같은 뜻)."""
    t = close.shape[1]
    cols: NDArray[np.int64] = np.broadcast_to(np.arange(t, dtype=np.int64), close.shape)
    idx: NDArray[np.int64] = np.where(np.isfinite(close), cols, np.int64(-1))
    last: NDArray[np.int64] = np.maximum.accumulate(idx, axis=1)
    out = np.full(close.shape, np.nan)
    if t <= n_days:
        return out
    end = last[:, n_days:]
    rows: NDArray[np.int64] = np.arange(close.shape[0], dtype=np.int64)[:, None]
    final = np.where(end >= 0, close[rows, np.maximum(end, 0)], np.nan)
    with np.errstate(divide="ignore", invalid="ignore"):
        out[:, : t - n_days] = np.log(final / close[:, : t - n_days])
    return out


@dataclass(frozen=True, slots=True)
class FeatureSpec:
    """HAR 피처 묶음 — 종가 창 · 범위 창 · 시장 창."""

    close_windows: tuple[int, ...] = CLOSE_WINDOWS
    range_windows: tuple[int, ...] = ()
    market_window: int | None = MARKET_WINDOW

    @property
    def names(self) -> list[str]:
        return [
            *(f"krx_logrv_close_{w}d" for w in self.close_windows),
            *(f"krx_logrv_range_{w}d" for w in self.range_windows),
            *([f"krx_logrv_market_{self.market_window}d"] if self.market_window else []),
        ]


def feature_stack(panel: DailyPanel, spec: FeatureSpec) -> NDArray[np.float64]:
    """(피처, 종목, 거래일). 시장 피처는 종목 축으로 펼친다."""
    sq = panel.r**2
    mats = [trailing_log_mean(sq, w) for w in spec.close_windows]
    mats += [trailing_log_mean(panel.range_var, w) for w in spec.range_windows]
    if spec.market_window:
        m = trailing_log_mean(panel.market**2, spec.market_window)
        mats.append(np.broadcast_to(m, sq.shape))
    return np.stack(mats)


@dataclass(frozen=True, slots=True)
class HarFit:
    """as_of × 기간 하나의 풀링 적합. 계수는 [절편, 피처…], 예측 일 분산 = exp(x·β) × smear."""

    beta: Vec
    smear: float
    vr: float  # h주 분산비 — 평균(ret² ÷ (exp(적합값) × n)). 스미어링 대신 쓰는 절제(사전등록 `kr-scale@2`)
    edges: Vec  # 예측 로그 일 분산의 3분위 경계 2개
    z_by_bucket: tuple[Vec, ...]  # 버킷별 표준화 잔차 분위수(LEVELS, 중앙값 0)
    rows: int
    weeks: int

    def log_var(self, x: Vec) -> float:
        return float(self.beta[0] + x @ self.beta[1:])

    def daily_var(self, x: Vec, *, variance_ratio: bool = False) -> float:
        return float(np.exp(self.log_var(x)) * (self.vr if variance_ratio else self.smear))

    def bucket(self, x: Vec) -> int:
        """1 ~ N_BUCKETS(낮음 → 높음). 0 은 엔진이 '버킷 없음'으로 쓴다."""
        return int(np.searchsorted(self.edges, self.log_var(x), side="right")) + 1


def fit_har(x: Mat, y: Vec, ret: Vec, n_days: int, weeks: int) -> HarFit | None:
    """x (행, 피처) · y 목표 로그 일 분산 · ret 실현 h주 수익률. 행이 모자라거나 특이하면 None."""
    ok = np.isfinite(y) & np.isfinite(x).all(axis=1) & np.isfinite(ret)
    x, y, ret = x[ok], y[ok], ret[ok]
    k = x.shape[1] + 1
    if y.size < 20 * k:
        return None
    design = np.column_stack([np.ones(y.size), x])
    beta, *_ = np.linalg.lstsq(design, y, rcond=None)
    fitted = design @ beta
    smear = float(np.mean(np.exp(y - fitted)))
    vr = float(np.mean(ret**2 / (np.exp(fitted) * n_days)))
    edges = np.quantile(fitted, [1 / N_BUCKETS, 2 / N_BUCKETS])
    sigma = np.sqrt(np.exp(fitted) * smear * n_days)
    z = ret / sigma
    bucket = np.searchsorted(edges, fitted, side="right")
    shapes: list[Vec] = []
    for b in range(N_BUCKETS):
        zb = z[bucket == b]
        q = np.quantile(zb, LEVELS_ARR) if zb.size >= 50 else np.quantile(z, LEVELS_ARR)
        shapes.append(q - q[3])  # 위치 0(FR-6) — 중앙값을 뺀다
    return HarFit(beta.astype(np.float64), smear, vr, edges.astype(np.float64), tuple(shapes), int(y.size), weeks)


def qlike_loss(realized: Vec, variance: Vec) -> Vec:
    """행별 QLIKE r²/σ² + ln σ²(Patton 2011) — 작을수록 좋다. 분산 대용치 r² 가 0 이어도 정의된다."""
    return realized**2 / variance + np.log(variance)

"""국내 주식 척도 도전자 — 사전등록 `kr-scale@1`(FC-REQ-020 FR-11 ~ FR-13 · FR-15) · `kr-scale@2`(형태 없는 범위
HAR 판정 + ACI · 분산비 절제).

`domain/har.py` 의 행렬을 거래일 달력에 맞춰 한 번 깔고, as_of × 기간마다 풀링 HAR 를 **한 번** 적합해 캐시한다
(performance.md §2). 적합 행 = 주 격자 g 중 라벨이 as_of 이전에 끝난(label_end(g, h) ≤ as_of) 최근 156주 ×
그때 유니버스 종목 — 엠바고(time-and-leakage.md §4). 전망에 쓰는 피처는 as_of 에 종가를 아는 마지막 거래일까지.

패널은 미래 일봉까지 들고 있다 — 시점 고정은 **위치 자르기**로 지킨다. `tests/leakage/test_kr_scale_leakage.py` 가
미래 봉을 지운 패널과 같은 전망이 나오는지 본다.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.baselines import RawForecast
from salt_forecast.domain.calendar import KRX_CLOSE_AVAILABLE, KrxSessions
from salt_forecast.domain.har import (
    CLOSE_WINDOWS,
    MARKET_WINDOW,
    RANGE_WINDOWS,
    DailyPanel,
    FeatureSpec,
    HarFit,
    build_panel,
    feature_stack,
    fit_har,
    forward_log_mean,
    forward_log_return,
)
from salt_forecast.domain.quantiles import Z_SCORES, QuantileForecast
from salt_forecast.domain.series import WEEK, CloseSeries, OhlcvSeries

KEY = "kr-scale@1"
TRAIN_WEEKS = 156
MIN_TRAIN_WEEKS = 26

KR_HAR = "kr-har@0.1.0"
KR_HAR_RANGE = "kr-har-range@0.1.0"
KR_HAR_FHS = "kr-har-fhs@0.1.0"
KR_HAR_MONDRIAN = "kr-har-mondrian@0.1.0"
# 판정 대상은 마지막 하나 — 앞의 셋은 절제 표(사전등록 [challengers])
KR_CHALLENGER = KR_HAR_MONDRIAN

KEY_2 = "kr-scale@2"
KR_HAR_RANGE_ACI = "kr-har-range-aci@0.1.0"
KR_HAR_RANGE_VR = "kr-har-range-vr@0.1.0"
# `kr-scale@2` 판정 대상 — `kr-scale@1` 의 절제 a2 와 같은 계산(버전은 계산의 이름). 절제 둘은 처음 잰다
KR_CHALLENGER_2 = KR_HAR_RANGE
KR_SCALE_2_ABLATIONS: tuple[str, ...] = (KR_HAR_RANGE_ACI, KR_HAR_RANGE_VR)
ACI_GAMMA = 0.05
KR_SCALE_MODELS: tuple[str, ...] = (KR_HAR, KR_HAR_RANGE, KR_HAR_FHS, KR_HAR_MONDRIAN, *KR_SCALE_2_ABLATIONS)

CLOSE_ONLY = FeatureSpec(CLOSE_WINDOWS, (), MARKET_WINDOW)
WITH_RANGE = FeatureSpec(CLOSE_WINDOWS, RANGE_WINDOWS, MARKET_WINDOW)

Shape = Literal["normal", "fhs"]


def _matrices(
    bars: Mapping[str, OhlcvSeries], schedule: KrxSessions
) -> tuple[list[str], tuple[NDArray[np.float64], ...]]:
    """(종목, 거래일) OHLCV 행렬. 달력에 없는 날의 봉은 버린다(달력 = 서버 개장일 ∪ 봉이 있는 날이라 보통 없다)."""
    symbols = sorted(bars)
    days = schedule.sessions
    mats = tuple(np.full((len(symbols), days.size), np.nan) for _ in range(5))
    for k, sym in enumerate(symbols):
        b = bars[sym]
        day = b.available_at - KRX_CLOSE_AVAILABLE
        pos = np.searchsorted(days, day)
        ok = (pos < days.size) & (days[np.minimum(pos, days.size - 1)] == day)
        for m, col in zip(mats, (b.open, b.high, b.low, b.close, b.volume), strict=True):
            m[k, pos[ok]] = col[ok]
    return symbols, mats


@dataclass(frozen=True, slots=True)
class _Rows:
    x: NDArray[np.float64]
    y: NDArray[np.float64]
    ret: NDArray[np.float64]


class KrScalePanel:
    """전 종목 패널 + as_of × 기간 × 피처 묶음별 적합 캐시. 도전자 넷이 하나를 같이 쓴다."""

    def __init__(
        self,
        bars: Mapping[str, OhlcvSeries],
        schedule: KrxSessions,
        eligible: Callable[[int], frozenset[str]],
        horizons: Sequence[int],
    ) -> None:
        self.schedule = schedule
        self._eligible = eligible
        self.symbols, (o, hi, lo, c, v) = _matrices(bars, schedule)
        self._row = {s: i for i, s in enumerate(self.symbols)}
        self.panel: DailyPanel = build_panel(o, hi, lo, c, v)
        self._close_known = schedule.sessions + KRX_CLOSE_AVAILABLE
        n_days = {h: schedule.days_per_week * h for h in horizons}
        self._target = {h: forward_log_mean(self.panel.r**2, n) for h, n in n_days.items()}
        self._ret = {h: forward_log_return(self.panel.close, n) for h, n in n_days.items()}
        self._features: dict[FeatureSpec, NDArray[np.float64]] = {}
        sessions = schedule.sessions
        # 첫 종가가 알려진 뒤부터 — 그 전 격자는 라벨 끝이 없다(정렬돼야 searchsorted 가 맞다)
        self.grid: list[int] = schedule.grid(int(self._close_known[0]), int(sessions[-1])) if sessions.size else []
        never = np.iinfo(np.int64).max
        self._label_end = {
            h: np.asarray(
                [e if (e := schedule.label_end(g, h)) is not None else never for g in self.grid], dtype=np.int64
            )
            for h in horizons
        }
        self._weeks: dict[tuple[FeatureSpec, int, int], _Rows] = {}
        self._fits: dict[tuple[FeatureSpec, int, int, int], HarFit | None] = {}

    def base(self, as_of: int) -> int:
        """as_of 에 종가를 아는 마지막 거래일 위치(-1 = 없음)."""
        return int(np.searchsorted(self._close_known, as_of, side="right")) - 1

    def _stack(self, spec: FeatureSpec) -> NDArray[np.float64]:
        if spec not in self._features:
            self._features[spec] = feature_stack(self.panel, spec)
        return self._features[spec]

    def _week(self, spec: FeatureSpec, gi: int, h: int) -> _Rows:
        key = (spec, gi, h)
        if key not in self._weeks:
            g = self.grid[gi]
            i = self.base(g)
            rows = np.asarray(sorted(self._row[s] for s in self._eligible(g) if s in self._row), dtype=np.int64)
            rows = rows[np.isfinite(self.panel.close[rows, i])] if i >= 0 and rows.size else rows[:0]
            self._weeks[key] = _Rows(
                self._stack(spec)[:, rows, i].T if rows.size else np.empty((0, len(spec.names))),
                self._target[h][rows, i] if rows.size else np.empty(0),
                self._ret[h][rows, i] if rows.size else np.empty(0),
            )
        return self._weeks[key]

    def fit(self, as_of: int, h: int, spec: FeatureSpec) -> HarFit | None:
        """라벨이 as_of 이전에 끝난 최근 TRAIN_WEEKS 주의 풀링 적합. 주가 모자라면 None."""
        hi = int(np.searchsorted(self._label_end[h], as_of, side="right"))
        lo = int(np.searchsorted(np.asarray(self.grid, dtype=np.int64), as_of - TRAIN_WEEKS * WEEK, side="left"))
        key = (spec, h, lo, hi)
        if key not in self._fits:
            weeks = hi - lo
            if weeks < MIN_TRAIN_WEEKS:
                self._fits[key] = None
            else:
                parts = [self._week(spec, gi, h) for gi in range(lo, hi)]
                self._fits[key] = fit_har(
                    np.concatenate([p.x for p in parts]),
                    np.concatenate([p.y for p in parts]),
                    np.concatenate([p.ret for p in parts]),
                    self.schedule.days_per_week * h,
                    weeks,
                )
        return self._fits[key]

    def features(self, symbol: str, as_of: int, spec: FeatureSpec) -> NDArray[np.float64] | None:
        k = self._row.get(symbol)
        i = self.base(as_of)
        if k is None or i < 0:
            return None
        x = self._stack(spec)[:, k, i]
        return x if bool(np.isfinite(x).all()) else None


class HarScale:
    """위치 0 · 풀링 HAR 척도. 형태는 정규 또는 패널 FHS, mondrian 이면 σ̂ 버킷을 엔진 보정에 넘긴다.
    `variance_ratio` 면 스미어링 대신 h주 분산비로 척도를 맞춘다."""

    def __init__(
        self, panel: KrScalePanel, spec: FeatureSpec, shape: Shape, mondrian: bool, variance_ratio: bool = False
    ) -> None:
        self.panel, self.spec, self.shape, self.mondrian = panel, spec, shape, mondrian
        self.variance_ratio = variance_ratio

    def raw(self, symbol: str, sliced: CloseSeries, h: int, as_of: int) -> RawForecast | None:
        fit = self.panel.fit(as_of, h, self.spec)
        x = self.panel.features(symbol, as_of, self.spec)
        if fit is None or x is None:
            return None
        scale = float(
            np.sqrt(fit.daily_var(x, variance_ratio=self.variance_ratio) * self.panel.schedule.days_per_week * h)
        )
        if not np.isfinite(scale) or scale <= 0:
            return None
        bucket = fit.bucket(x)
        z = fit.z_by_bucket[bucket - 1] if self.shape == "fhs" else Z_SCORES
        return RawForecast(QuantileForecast.from_array(z * scale, 0.5), scale, bucket if self.mondrian else 0)


def scale_providers(panel: KrScalePanel) -> dict[str, HarScale]:
    return {
        KR_HAR: HarScale(panel, CLOSE_ONLY, "normal", mondrian=False),
        KR_HAR_RANGE: HarScale(panel, WITH_RANGE, "normal", mondrian=False),
        KR_HAR_FHS: HarScale(panel, WITH_RANGE, "fhs", mondrian=False),
        KR_HAR_MONDRIAN: HarScale(panel, WITH_RANGE, "fhs", mondrian=True),
        # ACI 는 엔진이 한다(`WalkForward(aci=…)`) — raw 는 도전자와 같다
        KR_HAR_RANGE_ACI: HarScale(panel, WITH_RANGE, "normal", mondrian=False),
        KR_HAR_RANGE_VR: HarScale(panel, WITH_RANGE, "normal", mondrian=False, variance_ratio=True),
    }


def scale_aci() -> dict[str, float]:
    """`WalkForward(aci=…)` 에 넘길 모델 → γ."""
    return {KR_HAR_RANGE_ACI: ACI_GAMMA}


def scale_model_params(version: str) -> dict[str, object]:
    spec = CLOSE_ONLY if version == KR_HAR else WITH_RANGE
    calibration = {KR_HAR_MONDRIAN: "mondrian-3-buckets-CQR", KR_HAR_RANGE_ACI: f"ACI-pooled-gamma-{ACI_GAMMA}"}
    return {
        "asset_type": "kr_stock",
        "preregistration": KEY_2 if version in KR_SCALE_2_ABLATIONS else KEY,
        **({"judged_by": KEY_2} if version == KR_CHALLENGER_2 else {}),
        "location": "zero",
        "scale": "pooled-HAR-log-OLS-" + ("variance-ratio" if version == KR_HAR_RANGE_VR else "duan-smearing"),
        "features": spec.names,
        "train_weeks": TRAIN_WEEKS,
        "min_train_weeks": MIN_TRAIN_WEEKS,
        "shape": "panel-FHS-3-buckets" if version in (KR_HAR_FHS, KR_HAR_MONDRIAN) else "normal",
        "calibration": calibration.get(version, "normalized-CQR-pooled"),
        "role": "challenger" if version in (KR_CHALLENGER, KR_CHALLENGER_2) else "ablation",
    }

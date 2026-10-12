"""국내 주식 전망 모델(FC-REQ-009 · FC-REQ-020) — 기준 모델 + 보정만.

코인과 **버전 이름을 나눈다**: 같은 `ens-baseline@0.1.0` 을 쓰면 점수 · 게이트 · 리포트를 모델 버전으로 모을 때
자산군이 섞인다(FEATURE-011 FR-82, modeling-evaluation.md §6 "버전을 섞어 지표를 내지 않는다").
LightGBM 은 켜지 않는다 — 풀링 종목 200 미만(시세 유니버스 약 50, modeling-evaluation.md §3).

`@0.2.0` 은 위치 0(FC-REQ-020 FR-6). `@0.1.0` 이 기준 A 를 이긴 건 과거 창의 상승을 중앙값으로 배운 것이었다
(실력 감사 — 현재 시총 상위 = 지난 2년 오른 종목). `@0.1.0` 은 백테스트 리포트의 비교 행으로만 남긴다.
"""

from __future__ import annotations

from salt_forecast.domain.baselines import RawForecast, empirical_shape_zero, ensemble, random_walk_normal
from salt_forecast.domain.calendar import KrxSessions
from salt_forecast.domain.series import CloseSeries
from salt_forecast.models.engine import CALIBRATION, BaselineEnsemble, Provider, RandomWalk
from salt_forecast.models.kr_scale import (
    KR_CHALLENGER,
    KR_SCALE_MODELS,
    KrScalePanel,
    scale_model_params,
    scale_providers,
)

KR_BASELINE = "kr-rw-normal@0.1.0"
KR_ENSEMBLE_V1 = "kr-ens-baseline@0.1.0"
KR_ENSEMBLE = "kr-ens-baseline@0.2.0"
# 챔피언 — 사전등록 `kr-scale@1` 도전자가 풀링 게이트 1 · 2주 통과 · 플라시보 거짓 발견 17%(≤ 20%)로 교체
# (2026-10-12, reports/kr-backtest-2026-10-12.md). 풀링 게이트를 못 넘는 기간은 카드가 꺼진 채다
KR_PRODUCTION = KR_CHALLENGER
# 매일 live 예측 · 채점
KR_MODELS: tuple[str, ...] = (KR_BASELINE, KR_PRODUCTION)
# 백테스트 리포트에만 — 매일 예측 · 게이트에는 없다. 이미 낸 live 예측은 매일 작업이 계속 채점한다
KR_RETIRED: tuple[str, ...] = (KR_ENSEMBLE, KR_ENSEMBLE_V1)

_GRID = {"grid": "krx-first-session-of-week", "bars_per_week": 5, "close_available_kst": "16:00"}


class ZeroLocationEnsemble:
    """기준 A(정규) + 형태만 빌린 경험 분위수 — 둘 다 중앙값 0 · 상승 확률 0.5."""

    def __init__(self, schedule: KrxSessions) -> None:
        self.days, self.gap = schedule.days_per_week, schedule.max_gap

    def raw(self, symbol: str, sliced: CloseSeries, h: int, as_of: int) -> RawForecast | None:
        a = random_walk_normal(sliced, h, self.days, self.gap)
        b = empirical_shape_zero(sliced, h, self.days, self.gap)
        return ensemble([a, b]) if a and b else None


def kr_providers(schedule: KrxSessions, *, with_retired: bool = False) -> dict[str, Provider]:
    """기준 계열 — 기준 A + 위치 0 앙상블(은퇴 챔피언). 척도 패널이 필요 없는 모델만."""
    out: dict[str, Provider] = {KR_BASELINE: RandomWalk(schedule), KR_ENSEMBLE: ZeroLocationEnsemble(schedule)}
    if with_retired:
        out[KR_ENSEMBLE_V1] = BaselineEnsemble(schedule)
    return out


def kr_live_providers(schedule: KrxSessions, panel: KrScalePanel) -> dict[str, Provider]:
    """매일 작업 — 기준 A + 챔피언."""
    return {KR_BASELINE: RandomWalk(schedule), KR_PRODUCTION: scale_providers(panel)[KR_PRODUCTION]}


def kr_model_params(version: str) -> dict[str, object]:
    if version in KR_SCALE_MODELS:
        return {**scale_model_params(version), **_GRID}
    parts = {
        KR_BASELINE: ["rw-normal"],
        KR_ENSEMBLE_V1: ["rw-normal", "empirical-quantile"],
        KR_ENSEMBLE: ["rw-normal", "empirical-shape-location-zero"],
    }[version]
    return {
        "asset_type": "kr_stock",
        "parts": parts,
        "location": "zero" if version != KR_ENSEMBLE_V1 else "learned",
        **_GRID,
        **CALIBRATION,
    }

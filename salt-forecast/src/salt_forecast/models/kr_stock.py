"""국내 주식 전망 모델(FC-REQ-009) — 기준 모델 + 보정만.

코인과 **버전 이름을 나눈다**: 같은 `ens-baseline@0.1.0` 을 쓰면 점수 · 게이트 · 리포트를 모델 버전으로 모을 때
자산군이 섞인다(FEATURE-011 FR-82, modeling-evaluation.md §6 "버전을 섞어 지표를 내지 않는다").
LightGBM 은 켜지 않는다 — 풀링 종목 200 미만(시세 유니버스 약 50, modeling-evaluation.md §3).
"""

from __future__ import annotations

from salt_forecast.domain.calendar import KrxSessions
from salt_forecast.models.engine import CALIBRATION, BaselineEnsemble, Provider, RandomWalk

KR_BASELINE = "kr-rw-normal@0.1.0"
KR_ENSEMBLE = "kr-ens-baseline@0.1.0"
# 챔피언. 도전자는 아직 없다 — 코인 앙상블과 같은 구성이 기준 A 를 이기는지부터 본다
KR_PRODUCTION = KR_ENSEMBLE
KR_MODELS: tuple[str, ...] = (KR_BASELINE, KR_ENSEMBLE)

_GRID = {"grid": "krx-first-session-of-week", "bars_per_week": 5, "close_available_kst": "16:00"}


def kr_providers(schedule: KrxSessions) -> dict[str, Provider]:
    return {KR_BASELINE: RandomWalk(schedule), KR_ENSEMBLE: BaselineEnsemble(schedule)}


def kr_model_params(version: str) -> dict[str, object]:
    parts = ["rw-normal"] if version == KR_BASELINE else ["rw-normal", "empirical-quantile"]
    return {"asset_type": "kr_stock", "parts": parts, **_GRID, **CALIBRATION}

"""운영 모델 조립 — 백테스트와 매일 작업이 같은 조립을 쓴다."""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence

from salt_forecast.domain.series import CloseSeries
from salt_forecast.features.build import FEATURES, MarketContext
from salt_forecast.models import lgbm
from salt_forecast.models.engine import (
    BASELINE,
    CALIBRATION,
    ENSEMBLE,
    HORIZONS,
    Provider,
    baseline_providers,
    grid_for,
)

# 챔피언 / 도전자. 게이트 · 카드는 챔피언만 본다. 도전자는 백테스트에서 채점만 받고, 기준 대비 하한 > 0 으로
# 이기면 **코드 변경 + 체크리스트 기록**으로 승격한다.
# 자동 승격은 없다 — 무엇이 화면에 가는지는 사람이 기록과 함께 정한다.
# 2026-09-23: lgbm-quantile@0.1.0 이 기준보다 pinball 6.7~9.1% 나빴다(reports/backtest-2026-09-23.md) → 챔피언은 앙상블.
PRODUCTION = ENSEMBLE
CHALLENGERS: tuple[str, ...] = (lgbm.VERSION,)
MODEL_PARAMS: dict[str, dict[str, object]] = {
    BASELINE: {"parts": ["rw-normal"], **CALIBRATION},
    ENSEMBLE: {"parts": ["rw-normal", "empirical-quantile"], **CALIBRATION},
    lgbm.VERSION: {
        "features": list(FEATURES),
        "params": lgbm.PARAMS,
        "num_boost_round": lgbm.NUM_BOOST_ROUND,
        "retrain_every_weeks": lgbm.RETRAIN_EVERY_WEEKS,
        "train_weeks": lgbm.TRAIN_WEEKS,
        "target": "log_return / (daily_vol * sqrt(days))",
        **CALIBRATION,
    },
}


def providers(
    series: Mapping[str, CloseSeries],
    ctx: MarketContext,
    extra_as_ofs: Sequence[int] = (),
    on_progress: Callable[[int, int], None] | None = None,
    *,
    with_challengers: bool = True,
) -> tuple[dict[str, Provider], lgbm.LgbmQuantile | None]:
    """매일 작업은 with_challengers=False — 도전자 학습(수 분)을 매일 하지 않는다. 챔피언이 도전자면 늘 포함."""
    if not with_challengers and PRODUCTION not in CHALLENGERS:
        return baseline_providers(), None
    model = lgbm.LgbmQuantile(series, ctx, HORIZONS, grid_for(series), extra_as_ofs, on_progress=on_progress)
    model.fit_predict()
    return {**baseline_providers(), lgbm.VERSION: model}, model

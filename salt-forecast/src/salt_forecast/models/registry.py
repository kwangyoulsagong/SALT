"""운영 모델 조립 — 백테스트와 매일 작업이 같은 조립을 쓴다."""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Literal

from salt_forecast.domain.features import OHLCV_FEATURES
from salt_forecast.domain.series import CloseSeries
from salt_forecast.features.build import FEATURES_V1, MarketContext
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

# 모든 코인에 같은 값인 피처 — 한 주에 하나의 값이라 서로 다른 주(≈180)만큼만 배울 수 있다.
MARKET_WIDE = frozenset(f for f in FEATURES_V1 if f.startswith(("mac_", "stc_")) or f == "btc_ret_4w")
COIN_SPECIFIC: tuple[str, ...] = tuple(f for f in FEATURES_V1 if f not in MARKET_WIDE)


@dataclass(frozen=True, slots=True)
class Challenger:
    version: str
    features: tuple[str, ...]
    params: Mapping[str, object]
    why: str
    mode: Literal["quantile", "vol_scale"] = "quantile"
    vol_base: Literal["normal", "ensemble"] = "normal"
    vol_shrink: float = 1.0


CHALLENGER_SPECS: dict[str, Challenger] = {
    c.version: c
    for c in (
        Challenger("lgbm-quantile@0.1.0", FEATURES_V1, {}, "전 피처 — 기준보다 6.7~9.1% 나빴다(2026-09-23)"),
        Challenger("lgbm-quantile@0.2.0", COIN_SPECIFIC, {}, "코인별 피처만 — '시기를 외웠다' 가설 검증"),
        Challenger(
            "lgbm-quantile@0.2.1",
            COIN_SPECIFIC,
            {"num_leaves": 7, "min_data_in_leaf": 500, "lambda_l2": 10.0, "num_boost_round": 100},
            "코인별 피처 + 강한 규제 — 과적합 가설 검증",
        ),
        Challenger(
            "lgbm-volscale@0.4.0",
            tuple(f for f in COIN_SPECIFIC if f != "px_age_days"),
            {"num_leaves": 7, "min_data_in_leaf": 500, "lambda_l2": 10.0, "num_boost_round": 100},
            "변동성 배율만 학습(방향 없음). px_age_days 제거 — "
            "2022-09 백필 시작 때문에 날짜 그 자체였다(v0.2 기여도 45~58%)",
            "vol_scale",
        ),
        Challenger(
            "lgbm-volscale@0.5.0",
            tuple(f for f in COIN_SPECIFIC if f != "px_age_days"),
            {"num_leaves": 7, "min_data_in_leaf": 500, "lambda_l2": 10.0, "num_boost_round": 100},
            "v0.4 배율을 제곱근으로 수축해 챔피언 앙상블 범위에 곱한다. "
            "설정은 돌리기 전에 하나로 정했다(백테스트 재사용 과적합 방지)",
            "vol_scale",
            "ensemble",
            0.5,
        ),
        Challenger(
            "lgbm-volscale@0.6.0",
            (*(f for f in COIN_SPECIFIC if f != "px_age_days"), *OHLCV_FEATURES),
            {"num_leaves": 7, "min_data_in_leaf": 500, "lambda_l2": 10.0, "num_boost_round": 100},
            "v0.5 + 거래량 변화 · 거래대금 · Garman-Klass 변동성(Dudek 외 2025 상위 피처의 일봉 대용). "
            "피처 외 설정은 v0.5 와 같다 — 차이를 피처에 돌리려고",
            "vol_scale",
            "ensemble",
            0.5,
        ),
    )
}
# 백테스트가 이번에 도는 도전자. 끝난 실험은 점수가 DB 에 남으므로 다시 돌리지 않는다.
# 2026-09-23 실험 중단(v0.6 까지 6회) — 같은 구간 재사용 과적합을 막으려고. 라이브 26주 뒤 재평가한다.
ACTIVE_CHALLENGERS: tuple[str, ...] = ("lgbm-volscale@0.6.0",)
CHALLENGERS: tuple[str, ...] = tuple(CHALLENGER_SPECS)


def providers(
    series: Mapping[str, CloseSeries],
    ctx: MarketContext,
    extra_as_ofs: Sequence[int] = (),
    on_progress: Callable[[int, int], None] | None = None,
    *,
    with_challengers: bool = True,
) -> tuple[dict[str, Provider], dict[str, lgbm.LgbmQuantile]]:
    """매일 작업은 with_challengers=False — 도전자 학습(수 분)을 매일 하지 않는다. 챔피언이 도전자면 늘 포함."""
    wanted = list(ACTIVE_CHALLENGERS) if with_challengers else []
    if PRODUCTION in CHALLENGER_SPECS and PRODUCTION not in wanted:
        wanted.append(PRODUCTION)
    fitted: dict[str, lgbm.LgbmQuantile] = {}
    for v in wanted:
        spec = CHALLENGER_SPECS[v]
        model = lgbm.LgbmQuantile(
            series,
            ctx,
            HORIZONS,
            grid_for(series),
            extra_as_ofs,
            on_progress=on_progress,
            features=spec.features,
            params=spec.params,
            version=v,
            mode=spec.mode,
            vol_base=spec.vol_base,
            vol_shrink=spec.vol_shrink,
        )
        model.fit_predict()
        fitted[v] = model
    return {**baseline_providers(), **fitted}, fitted


def model_params(version: str) -> dict[str, object]:
    if version == BASELINE:
        return {"parts": ["rw-normal"], **CALIBRATION}
    if version == ENSEMBLE:
        return {"parts": ["rw-normal", "empirical-quantile"], **CALIBRATION}
    spec = CHALLENGER_SPECS[version]
    return {
        "features": list(spec.features),
        "params": {**lgbm.PARAMS, **spec.params},
        "num_boost_round": spec.params.get("num_boost_round", lgbm.NUM_BOOST_ROUND),
        "retrain_every_weeks": lgbm.RETRAIN_EVERY_WEEKS,
        "train_weeks": lgbm.TRAIN_WEEKS,
        "target": (
            "|log_return| / (daily_vol * sqrt(days))"
            if spec.mode == "vol_scale"
            else "log_return / (daily_vol * sqrt(days))"
        ),
        "mode": spec.mode,
        "vol_base": spec.vol_base,
        "vol_shrink": spec.vol_shrink,
        "why": spec.why,
        **CALIBRATION,
    }

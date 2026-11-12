"""단타 방향 확률 쓰기 · 읽기(FC-REQ-028 FR-1 · FR-4 · 사전등록 short-direction@1). 서버는 뷰 둘만 읽는다."""

from __future__ import annotations

import json
import math
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Engine, text

from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import short_horizon_prediction, short_horizon_test


def _f(x: float) -> float | None:
    return x if math.isfinite(x) else None


def _ts(t: int) -> datetime | None:
    return datetime.fromtimestamp(t, tz=UTC) if t else None


@dataclass(frozen=True, slots=True)
class CellTestRow:
    market: str
    horizon: str
    status: str
    blocked_reason: str | None
    window: tuple[int, int]
    eval_rows: int
    bss: float
    bss_ci_low: float
    bss_ci_high: float
    bss_p_holm: float | None
    bss_persistence: float
    ece: float
    track_origin: str
    confident_calls: int
    confident_hits: int
    always_up_hits: int
    hit_diff_ci_low: float
    hit_diff_ci_high: float
    net_mean: float
    shuffle_ci_low: float
    shuffle_ci_high: float
    reliability: list[list[float]]
    misses: list[dict[str, Any]]
    z_quantiles: dict[str, list[float]]
    live_params: dict[str, object] | None
    live_ready: bool = False  # 화면 허가 — @3 는 판정 날짜에 통과(pass)한 칸만 true
    bss_climatology: float = float("nan")  # 기후값 대비(참고)


_TEST_COLS = (
    "prereg_key", "run_as_of", "market", "horizon", "model_version", "status", "blocked_reason", "window_from",
    "window_to", "eval_rows", "bss", "bss_ci_low", "bss_ci_high", "bss_p_holm", "bss_persistence", "ece",
    "track_origin", "confident_calls", "confident_hits", "always_up_hits", "hit_diff_ci_low", "hit_diff_ci_high",
    "net_mean", "shuffle_ci_low", "shuffle_ci_high", "reliability", "misses", "z_quantiles", "live_params",
    "live_ready", "bss_climatology", "computed_at",
)  # fmt: skip


def save_test(
    engine: Engine,
    key: str,
    model_version: str,
    run_as_of: datetime,
    rows: Sequence[CellTestRow],
    computed_at: datetime,
) -> int:
    values: list[Sequence[Any]] = [
        (
            key,
            run_as_of,
            r.market,
            r.horizon,
            None if r.status == "not_tested" else model_version,
            r.status,
            r.blocked_reason,
            _ts(r.window[0]),
            _ts(r.window[1]),
            r.eval_rows,
            _f(r.bss),
            _f(r.bss_ci_low),
            _f(r.bss_ci_high),
            r.bss_p_holm,
            _f(r.bss_persistence),
            _f(r.ece),
            r.track_origin,
            r.confident_calls,
            r.confident_hits,
            r.always_up_hits,
            _f(r.hit_diff_ci_low),
            _f(r.hit_diff_ci_high),
            _f(r.net_mean),
            _f(r.shuffle_ci_low),
            _f(r.shuffle_ci_high),
            json.dumps(r.reliability),
            json.dumps(r.misses),
            json.dumps(r.z_quantiles),
            None if r.live_params is None else json.dumps(r.live_params),
            r.live_ready,
            _f(r.bss_climatology),
            computed_at,
        )
        for r in rows
    ]
    return bulk_upsert(engine, short_horizon_test, _TEST_COLS, values, ("prereg_key", "market", "horizon", "run_as_of"))


@dataclass(frozen=True, slots=True)
class ActiveCell:
    market: str
    horizon: str
    model_version: str
    status: str
    live_params: dict[str, object]
    z_quantiles: dict[str, tuple[float, float, float]]


def active_cells(engine: Engine, key: str, as_of: datetime) -> list[ActiveCell]:
    """칸마다 as_of 까지 최신 시험이 forward(전진 시험 중) · pass 면 그 적합 — 라이브 예측의 유일한 입력(@3)."""
    sql = text(
        """
        SELECT market, horizon, model_version, status, live_params, z_quantiles FROM (
          SELECT DISTINCT ON (market, horizon) market, horizon, model_version, status, live_params, z_quantiles
          FROM forecast.short_horizon_test WHERE prereg_key = :key AND run_as_of <= :as_of
          ORDER BY market, horizon, run_as_of DESC
        ) t WHERE status IN ('pass', 'forward') AND live_params IS NOT NULL
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"key": key, "as_of": as_of}).all()
    out: list[ActiveCell] = []
    for market, horizon, mv, status, params, zq in rows:
        z = {str(k): (float(v[0]), float(v[1]), float(v[2])) for k, v in dict(zq).items()}
        out.append(ActiveCell(str(market), str(horizon), str(mv), str(status), dict(params), z))
    return out


def previous_status(engine: Engine, key: str, before: datetime) -> dict[tuple[str, str], tuple[str, str | None]]:
    """칸마다 이번 실행 직전 상태 — 판정 날짜에 정해진 pass · fail 은 다음 실행이 다시 forward 로 돌리지 않는다."""
    sql = text(
        """
        SELECT DISTINCT ON (market, horizon) market, horizon, status, blocked_reason
        FROM forecast.short_horizon_test WHERE prereg_key = :key AND run_as_of < :before
        ORDER BY market, horizon, run_as_of DESC
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"key": key, "before": before}).all()
    return {(str(m), str(h)): (str(st), None if r is None else str(r)) for m, h, st, r in rows}


@dataclass(frozen=True, slots=True)
class PredictionRow:
    symbol: str
    horizon: str
    as_of: datetime
    model_version: str
    market: str
    p_up: float
    q10: float
    q50: float
    q90: float
    ref_price: float
    invalidation: float
    expires_at: datetime
    p_ref: float | None = None  # 피처 없는 같은 모델(@3 판정 기준)


_PRED_COLS = (
    "symbol", "horizon", "as_of", "model_version", "prereg_key", "market", "p_up", "q10", "q50", "q90",
    "ref_price", "invalidation", "expires_at", "available_at", "p_ref",
)  # fmt: skip


def save_predictions(engine: Engine, key: str, rows: Sequence[PredictionRow], now: datetime) -> int:
    values: list[Sequence[Any]] = [
        (
            r.symbol,
            r.horizon,
            r.as_of,
            r.model_version,
            key,
            r.market,
            r.p_up,
            r.q10,
            r.q50,
            r.q90,
            r.ref_price,
            r.invalidation,
            r.expires_at,
            now,
            r.p_ref,
        )
        for r in rows
    ]
    return bulk_upsert(
        engine, short_horizon_prediction, _PRED_COLS, values, ("symbol", "horizon", "as_of", "model_version")
    )


def score_due(engine: Engine, now: datetime) -> int:
    """만료가 지난 예측 → 결과 한 줄. 끝 가격 = 만료 시각에 마감한 봉 종가(코인 1시간봉
    · 국내 일봉). 봉이 없으면 다음 실행에."""
    sql = text(
        """
        INSERT INTO forecast.short_horizon_outcome (symbol, horizon, as_of, model_version, realized, up, scored_at)
        SELECT p.symbol, p.horizon, p.as_of, p.model_version,
               ln(b.close / p.ref_price)::float8, b.close > p.ref_price, :now
        FROM forecast.short_horizon_prediction p
        JOIN forecast.price_bar b
          ON b.symbol = p.symbol
         AND b.source = CASE WHEN p.market = 'crypto' THEN 'upbit' ELSE 'kis' END
         AND b.interval = CASE WHEN p.market = 'crypto' THEN '1h' ELSE '1d' END
         AND b.available_at = p.expires_at
        LEFT JOIN forecast.short_horizon_outcome o
          ON o.symbol = p.symbol AND o.horizon = p.horizon AND o.as_of = p.as_of AND o.model_version = p.model_version
        WHERE o.symbol IS NULL AND p.expires_at <= :now
        ON CONFLICT DO NOTHING
        """
    )
    with engine.begin() as conn:
        return int(conn.execute(sql, {"now": now}).rowcount or 0)


@dataclass(frozen=True, slots=True)
class LiveOutcome:
    as_of: datetime
    symbol: str
    p_up: float
    p_ref: float | None
    realized: float
    ref_price: float
    expires_at: datetime


def live_outcomes(engine: Engine, market: str, horizon: str, prereg_key: str) -> list[LiveOutcome]:
    """이 키로 낸 예측 중 채점이 끝난 것 — 전진 판정 · 소등 · 라이브 성적의 입력. 시각 순."""
    sql = text(
        """
        SELECT p.as_of, p.symbol, p.p_up, p.p_ref, o.realized, p.ref_price::float8, p.expires_at
        FROM forecast.short_horizon_outcome o
        JOIN forecast.short_horizon_prediction p USING (symbol, horizon, as_of, model_version)
        WHERE p.market = :market AND p.horizon = :horizon AND p.prereg_key = :key ORDER BY p.as_of
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"market": market, "horizon": horizon, "key": prereg_key}).all()
    return [
        LiveOutcome(r[0], str(r[1]), float(r[2]), None if r[3] is None else float(r[3]), float(r[4]), float(r[5]), r[6])
        for r in rows
    ]


def kr_moved_last_open(engine: Engine) -> datetime | None:
    """forecast 에 옮겨진 마지막 국내 일봉 시작(거래일 00:00 KST) — 매시 회차가 일봉을 옮길 때인지(`due --kr-bar`).

    피처용 as-of 조회가 아니다. 약 2.5초(전 종목 훑음) — 매시 한 번.
    """
    with engine.connect() as conn:
        return conn.execute(
            text("SELECT max(open_time) FROM forecast.price_bar WHERE source = 'kis' AND interval = '1d'")
        ).scalar()

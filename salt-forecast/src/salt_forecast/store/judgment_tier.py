"""판단 원장 읽기(export 뷰) · 등급 쓰기(FC-REQ-028 FR-6 · 사전등록 judgment-tier@1)."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import Engine, text

from salt_forecast.domain.judgment_tier import Previous, Row
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import judgment_tier

KST = timedelta(hours=9)


def _utc(t: datetime) -> datetime:
    return t.replace(tzinfo=UTC) if t.tzinfo is None else t  # 원장은 timestamp(3) — Prisma 가 UTC 로 쓴다


def judgment_rows(engine: Engine, rule_version: str, as_of: datetime) -> dict[tuple[str, str, str], list[Row]]:
    """(시장, 모드, 출처) → 채점된 행. as_of 까지 채점이 끝난 것만.

    export 뷰로만 읽는다(public 직접 읽기 목록을 늘리지 않는다).
    """
    sql = text(
        """
        SELECT market, mode, sample_origin, action, judged_at, return_rate
        FROM public.v_judgment_outcome_export
        WHERE rule_version = :rule AND evaluated_at <= :as_of
          AND sample_origin IN ('live', 'backtest_full', 'backtest_price_only')
        """
    )
    out: dict[tuple[str, str, str], list[Row]] = {}
    with engine.connect() as conn:
        for market, mode, origin, action, judged_at, r in conn.execute(
            sql, {"rule": rule_version, "as_of": as_of.astimezone(UTC).replace(tzinfo=None)}
        ):
            at = _utc(judged_at)
            out.setdefault((str(market), str(mode), str(origin)), []).append(
                Row((at + KST).date(), at, str(action), float(r))
            )
    return out


def previous_tiers(engine: Engine, key: str, before: datetime) -> dict[tuple[str, str], Previous]:
    """칸마다 이번 실행 직전 등급 · 마지막 강등 시각."""
    sql = text(
        """
        SELECT DISTINCT ON (market, mode) market, mode, tier, demoted_at
        FROM forecast.judgment_tier
        WHERE prereg_key = :key AND run_as_of < :before
        ORDER BY market, mode, run_as_of DESC
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"key": key, "before": before}).all()
    return {(str(m), str(md)): Previous(str(t), None if d is None else _utc(d)) for m, md, t, d in rows}


@dataclass(frozen=True, slots=True)
class TierRow:
    market: str
    mode: str
    tier: str
    reason: str | None
    basis_source: str | None
    live_rows: int
    live_days: int
    live_candidates: int
    live_avoids: int
    live_effective_n: float
    live_spread: float | None
    live_ci_low: float | None
    live_ci_high: float | None
    live_p_holm: float | None
    regime_first: float | None
    regime_second: float | None
    backtest_spread: float | None
    backtest_ci_low: float | None
    backtest_ci_high: float | None
    demoted_at: datetime | None


_COLS = (
    "prereg_key", "run_as_of", "market", "mode", "rule_version", "tier", "reason", "basis_source",
    "live_rows", "live_days", "live_candidates", "live_avoids", "live_effective_n", "live_spread",
    "live_ci_low", "live_ci_high", "live_p_holm", "regime_first", "regime_second",
    "backtest_spread", "backtest_ci_low", "backtest_ci_high", "demoted_at", "computed_at",
)  # fmt: skip


def save_tiers(
    engine: Engine, key: str, rule_version: str, run_as_of: datetime, rows: Sequence[TierRow], computed_at: datetime
) -> int:
    values: list[Sequence[Any]] = [
        (
            key,
            run_as_of,
            r.market,
            r.mode,
            rule_version,
            r.tier,
            r.reason,
            r.basis_source,
            r.live_rows,
            r.live_days,
            r.live_candidates,
            r.live_avoids,
            r.live_effective_n,
            r.live_spread,
            r.live_ci_low,
            r.live_ci_high,
            r.live_p_holm,
            r.regime_first,
            r.regime_second,
            r.backtest_spread,
            r.backtest_ci_low,
            r.backtest_ci_high,
            r.demoted_at,
            computed_at,
        )
        for r in rows
    ]
    return bulk_upsert(engine, judgment_tier, _COLS, values, ("prereg_key", "market", "mode", "run_as_of"))

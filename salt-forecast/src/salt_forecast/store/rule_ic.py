"""사전등록 · 규칙 IC 쓰기(FC-REQ-008)."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from sqlalchemy import Engine, select
from sqlalchemy.dialects.postgresql import insert

from salt_forecast.domain.ic import IcResult
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import preregistration, rule_ic


class PreregistrationConflict(Exception):
    """같은 key 에 다른 내용 — 등록은 고치지 않는다. 새 key 로 새 파일을 만든다."""


@dataclass(frozen=True, slots=True)
class Registration:
    key: str
    registered_at: datetime
    git_sha: str
    content_sha256: str
    spec: dict[str, Any]


def register(engine: Engine, r: Registration) -> bool:
    """처음이면 쓰고 True, 같은 내용이 이미 있으면 False, 다르면 PreregistrationConflict."""
    with engine.begin() as conn:
        row = conn.execute(select(preregistration.c.content_sha256).where(preregistration.c.key == r.key)).first()
        if row is not None:
            if row[0] != r.content_sha256:
                raise PreregistrationConflict(f"{r.key}: 등록된 내용과 파일이 다르다")
            return False
        conn.execute(
            insert(preregistration).values(
                key=r.key,
                registered_at=r.registered_at,
                git_sha=r.git_sha,
                content_sha256=r.content_sha256,
                spec=r.spec,
            )
        )
        return True


_COLS = (
    "prereg_key", "run_as_of", "source", "item", "mode", "horizon_days", "label_kind", "regime", "ic_kind",
    "window_start", "window_end", "n_dates", "mean_obs", "ic_mean", "ci_low", "ci_high", "t_naive", "verdict",
    "is_primary",
)  # fmt: skip
_PK = ("prereg_key", "run_as_of", "source", "item", "mode", "horizon_days", "label_kind", "regime")


def _num(x: float) -> float | None:
    return None if x != x else x  # NaN → NULL


def save_results(
    engine: Engine,
    key: str,
    run_as_of: datetime,
    source: str,
    regime: str,
    window: tuple[date, date],
    results: Sequence[IcResult],
) -> int:
    rows = (
        (
            key,
            run_as_of,
            source,
            r.item,
            r.mode,
            r.horizon_days,
            r.label_kind,
            regime,
            r.ic_kind,
            window[0],
            window[1],
            r.n_dates,
            _num(r.mean_obs),
            _num(r.ic_mean),
            _num(r.ci_low),
            _num(r.ci_high),
            _num(r.t_naive),
            r.verdict,
            r.primary,
        )
        for r in results
    )
    return bulk_upsert(engine, rule_ic, _COLS, rows, _PK)


@dataclass(frozen=True, slots=True)
class StoredIc:
    item: str
    mode: str
    horizon_days: int
    label_kind: str
    ic_mean: float
    ci_low: float
    ci_high: float
    is_primary: bool


def latest_backtest(engine: Engine, key: str, regime: str = "all") -> list[StoredIc]:
    """그 사전등록의 가장 최근 백테스트 실행 한 번(국면 하나). 값이 없는 행(NULL)은 뺀다."""
    t = rule_ic.c
    with engine.connect() as conn:
        last = conn.execute(
            select(t.run_as_of).where(t.prereg_key == key, t.source == "backtest").order_by(t.run_as_of.desc()).limit(1)
        ).scalar()
        if last is None:
            return []
        rows = conn.execute(
            select(t.item, t.mode, t.horizon_days, t.label_kind, t.ic_mean, t.ci_low, t.ci_high, t.is_primary)
            .where(t.prereg_key == key, t.source == "backtest", t.run_as_of == last, t.regime == regime)
            .order_by(t.item, t.mode, t.horizon_days, t.label_kind)
        ).all()
    return [
        StoredIc(r[0], r[1], int(r[2]), r[3], float(r[4]), float(r[5]), float(r[6]), bool(r[7]))
        for r in rows
        if r[4] is not None and r[5] is not None and r[6] is not None
    ]

"""주요 사건 일정 · 반응 · 통계 읽기 · 쓰기 (FC-REQ-005)."""

from __future__ import annotations

import json
from collections.abc import Iterable
from datetime import datetime

from sqlalchemy import Engine, select

from salt_forecast.domain.events import HORIZONS, Reaction, ReactionStats, ScheduledEvent
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import event_reaction, event_reaction_stats, scheduled_event


def upsert_events(engine: Engine, events: Iterable[ScheduledEvent], now: datetime) -> int:
    rows = [(e.kind, e.event_at, e.announced_at, e.source, e.source_ref, now) for e in events]
    return bulk_upsert(
        engine,
        scheduled_event,
        ("kind", "event_at", "announced_at", "source", "source_ref", "ingested_at"),
        rows,
        ("kind", "event_at"),
    )


def events_known(engine: Engine, as_of: datetime) -> list[ScheduledEvent]:
    """as_of 에 알 수 있던 일정(announced_at <= as_of) — time-and-leakage.md §2."""
    stmt = select(scheduled_event).where(scheduled_event.c.announced_at <= as_of).order_by(scheduled_event.c.event_at)
    with engine.connect() as conn:
        return [ScheduledEvent(r.kind, r.event_at, r.announced_at, r.source, r.source_ref) for r in conn.execute(stmt)]


def upsert_reactions(engine: Engine, reactions: Iterable[Reaction], now: datetime) -> int:
    rows = [
        (
            r.kind,
            r.event_at,
            r.symbol,
            r.ref_bar_open,
            r.pre_return_5d,
            r.pre_volume_ratio,
            *(r.returns[h] for h in HORIZONS),
            now,
        )
        for r in reactions
    ]
    return bulk_upsert(
        engine,
        event_reaction,
        (
            "kind",
            "event_at",
            "symbol",
            "ref_bar_open",
            "pre_return_5d",
            "pre_volume_ratio",
            "ret_1d",
            "ret_5d",
            "ret_20d",
            "computed_at",
        ),
        rows,
        ("kind", "event_at", "symbol"),
    )


def upsert_stats(engine: Engine, stats: Iterable[ReactionStats]) -> int:
    rows = [
        (
            s.kind,
            s.symbol,
            s.horizon_days,
            s.as_of,
            s.sample,
            *(s.quantiles or (None,) * 5),
            s.up_rate,
            *(s.baseline or (None,) * 3),
            s.move_ratio,
            s.pre_return_5d_median,
            json.dumps(s.recent_misses),
            json.dumps(s.recent_events),
            s.renderable,
            s.blocked_reason,
        )
        for s in stats
    ]
    return bulk_upsert(
        engine,
        event_reaction_stats,
        (
            "kind",
            "symbol",
            "horizon_days",
            "as_of",
            "sample",
            "q05",
            "q25",
            "q50",
            "q75",
            "q95",
            "up_rate",
            "baseline_q05",
            "baseline_q50",
            "baseline_q95",
            "move_ratio",
            "pre_return_5d_median",
            "recent_misses",
            "recent_events",
            "renderable",
            "blocked_reason",
        ),
        rows,
        ("kind", "symbol", "horizon_days", "as_of"),
    )

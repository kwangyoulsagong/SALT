# pyright: reportUnknownArgumentType=false, reportUnknownVariableType=false
# SQLAlchemy Core 의 Column 제네릭은 선언만으로 추론되지 않는다 — 이 파일에만 푼다.
"""forecast 스키마 선언 — 손으로 쓴다. 리플렉션 금지(db-contract.md §2).

DDL 의 출처는 salt-server/prisma/migrations/20260923120000_forecast_schema.
바뀌면 tests/store/test_schema_contract.py 가 깨진다.
"""

from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    MetaData,
    Numeric,
    SmallInteger,
    Table,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB

metadata = MetaData(schema="forecast")

job_run = Table(
    "job_run",
    metadata,
    Column("id", BigInteger, primary_key=True, autoincrement=True),
    Column("job", Text, nullable=False),
    Column("args", JSONB, nullable=False),
    Column("started_at", DateTime(timezone=True), nullable=False),
    Column("finished_at", DateTime(timezone=True)),
    Column("ok", Boolean),
    Column("rows", Integer),
    Column("error", Text),
)

source_status = Table(
    "source_status",
    metadata,
    Column("source", Text, primary_key=True),
    Column("last_success_at", DateTime(timezone=True)),
    Column("last_failure_at", DateTime(timezone=True)),
    Column("last_error", Text),
)

price_bar = Table(
    "price_bar",
    metadata,
    Column("source", Text, primary_key=True),
    Column("symbol", Text, primary_key=True),
    Column("interval", Text, primary_key=True),
    Column("open_time", DateTime(timezone=True), primary_key=True),
    Column("close_time", DateTime(timezone=True), nullable=False),
    Column("available_at", DateTime(timezone=True), nullable=False),
    Column("open", Numeric, nullable=False),
    Column("high", Numeric, nullable=False),
    Column("low", Numeric, nullable=False),
    Column("close", Numeric, nullable=False),
    Column("volume", Numeric),
    Column("ingested_at", DateTime(timezone=True), nullable=False),
)

model = Table(
    "model",
    metadata,
    Column("model_version", Text, primary_key=True),
    Column("name", Text, nullable=False),
    Column("params", JSONB, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

_Q = ("q05", "q10", "q25", "q50", "q75", "q90", "q95")

prediction = Table(
    "prediction",
    metadata,
    Column("symbol", Text, primary_key=True),
    Column("horizon_weeks", SmallInteger, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("model_version", Text, primary_key=True),
    Column("kind", Text, nullable=False),
    Column("base_close", Numeric, nullable=False),
    *(Column(name, Float, nullable=False) for name in _Q),
    Column("p_up", Float, nullable=False),
    Column("direction", Text, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

score = Table(
    "score",
    metadata,
    Column("symbol", Text, primary_key=True),
    Column("horizon_weeks", SmallInteger, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("model_version", Text, primary_key=True),
    Column("kind", Text, nullable=False),
    Column("realized", Float, nullable=False),
    Column("hit90", Boolean, nullable=False),
    Column("hit80", Boolean, nullable=False),
    Column("width90", Float, nullable=False),
    Column("pinball", Float, nullable=False),
    Column("direction", Text, nullable=False),
    Column("direction_hit", Boolean),
    Column("scored_at", DateTime(timezone=True), nullable=False),
)

gate = Table(
    "gate",
    metadata,
    Column("symbol", Text, primary_key=True),
    Column("horizon_weeks", SmallInteger, primary_key=True),
    Column("model_version", Text, nullable=False),
    Column("baseline_version", Text, nullable=False),
    Column("evaluated_at", DateTime(timezone=True), nullable=False),
    Column("renderable", Boolean, nullable=False),
    Column("blocked_reason", Text),
    Column("score_kind", Text, nullable=False),
    Column("sample", Integer, nullable=False),
    Column("coverage90", Float),
    Column("width90", Float),
    Column("baseline_width90", Float),
    Column("pinball_skill", Float),
    Column("direction_calls", Integer, nullable=False),
    Column("direction_hits", Integer, nullable=False),
    Column("always_up_rate", Float),
    Column("direction_base_rate", Float),
    Column("range_renderable", Boolean, nullable=False),
    Column("range_blocked_reason", Text),
    Column("pinball_skill_ci_low", Float),
)


series_point = Table(
    "series_point",
    metadata,
    Column("source", Text, primary_key=True),
    Column("series_id", Text, primary_key=True),
    Column("observed_at", DateTime(timezone=True), primary_key=True),
    Column("available_at", DateTime(timezone=True), primary_key=True),
    Column("value", Float, nullable=False),
    Column("unit", Text, nullable=False),
    Column("ingested_at", DateTime(timezone=True), nullable=False),
)

# 20260924120000_forecast_events (FC-REQ-005)
scheduled_event = Table(
    "scheduled_event",
    metadata,
    Column("kind", Text, primary_key=True),
    Column("event_at", DateTime(timezone=True), primary_key=True),
    Column("announced_at", DateTime(timezone=True), nullable=False),
    Column("source", Text, nullable=False),
    Column("source_ref", Text, nullable=False),
    Column("ingested_at", DateTime(timezone=True), nullable=False),
)

event_reaction = Table(
    "event_reaction",
    metadata,
    Column("kind", Text, primary_key=True),
    Column("event_at", DateTime(timezone=True), primary_key=True),
    Column("symbol", Text, primary_key=True),
    Column("ref_bar_open", DateTime(timezone=True), nullable=False),
    Column("pre_return_5d", Float),
    Column("pre_volume_ratio", Float),
    Column("ret_1d", Float),
    Column("ret_5d", Float),
    Column("ret_20d", Float),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

event_reaction_stats = Table(
    "event_reaction_stats",
    metadata,
    Column("kind", Text, primary_key=True),
    Column("symbol", Text, primary_key=True),
    Column("horizon_days", SmallInteger, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("sample", Integer, nullable=False),
    Column("q05", Float),
    Column("q25", Float),
    Column("q50", Float),
    Column("q75", Float),
    Column("q95", Float),
    Column("up_rate", Float),
    Column("baseline_q05", Float),
    Column("baseline_q50", Float),
    Column("baseline_q95", Float),
    Column("move_ratio", Float),
    Column("pre_return_5d_median", Float),
    Column("recent_misses", JSONB),
    Column("recent_events", JSONB),
    Column("renderable", Boolean, nullable=False),
    Column("blocked_reason", Text),
)

realized_vol = Table(
    "realized_vol",
    metadata,
    Column("symbol", Text, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("last_bar_at", DateTime(timezone=True)),
    Column("sample", Integer, nullable=False),
    Column("ewma", Float),
    Column("garch", Float),
    Column("garch_alpha", Float),
    Column("garch_beta", Float),
    Column("qlike_ewma", Float),
    Column("qlike_garch", Float),
    Column("qlike_baseline", Float),
    Column("method", Text),
    Column("annualized", Float),
    Column("blocked_reason", Text),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

QUANTILE_COLUMNS = _Q

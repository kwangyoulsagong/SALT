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
    Date,
    DateTime,
    Float,
    Integer,
    MetaData,
    Numeric,
    SmallInteger,
    Table,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

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
    Column("window_from", DateTime(timezone=True)),
    Column("window_to", DateTime(timezone=True)),
    Column("miss_count", Integer),
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
    Column("window_from", DateTime(timezone=True)),
    Column("window_to", DateTime(timezone=True)),
    Column("miss_count", Integer),
    Column("miss_judged", Integer),
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
    Column("btc_beta", Float),  # 20260929110000_forecast_market_regime (FC-REQ-010)
)

QUANTILE_COLUMNS = _Q

# 20260927120000_forecast_market_signal (FC-REQ-007)
market_signal = Table(
    "market_signal",
    metadata,
    Column("symbol", Text, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("bar_open", DateTime(timezone=True), nullable=False),
    Column("funding_rate", Float),
    Column("funding_pct_1y", Float),
    Column("funding_sample", Integer, nullable=False),
    Column("funding_state", Text),
    Column("oi_usd", Float),
    Column("oi_at", DateTime(timezone=True)),
    Column("oi_change_7d", Float),
    Column("kimchi_premium", Float),
    Column("kimchi_state", Text),
    Column("kimchi_since", DateTime(timezone=True)),
    Column("fx_usdkrw", Float),
    Column("fx_observed_at", DateTime(timezone=True)),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

signal_event = Table(
    "signal_event",
    metadata,
    Column("kind", Text, primary_key=True),
    Column("symbol", Text, primary_key=True),
    Column("event_at", DateTime(timezone=True), primary_key=True),
    Column("value", Float, nullable=False),
    Column("ref_bar_open", DateTime(timezone=True), nullable=False),
    Column("pre_return_5d", Float),
    Column("ret_1d", Float),
    Column("ret_5d", Float),
    Column("ret_20d", Float),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

# F010 슬라이스 1 — 20260929100000_judgment_ledger_rule_ic (FC-REQ-008)
preregistration = Table(
    "preregistration",
    metadata,
    Column("key", Text, primary_key=True),
    Column("registered_at", DateTime(timezone=True), nullable=False),
    Column("recorded_at", DateTime(timezone=True), nullable=False),
    Column("git_sha", Text, nullable=False),
    Column("content_sha256", Text, nullable=False),
    Column("spec", JSONB, nullable=False),
)

rule_ic = Table(
    "rule_ic",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("run_as_of", DateTime(timezone=True), primary_key=True),
    Column("source", Text, primary_key=True),
    Column("item", Text, primary_key=True),
    Column("mode", Text, primary_key=True),
    Column("horizon_days", Integer, primary_key=True),
    Column("label_kind", Text, primary_key=True),
    Column("regime", Text, primary_key=True),
    Column("ic_kind", Text, nullable=False),
    Column("window_start", Date, nullable=False),
    Column("window_end", Date, nullable=False),
    Column("n_dates", Integer, nullable=False),
    Column("mean_obs", Float),
    Column("ic_mean", Float),
    Column("ci_low", Float),
    Column("ci_high", Float),
    Column("t_naive", Float),
    Column("verdict", Text, nullable=False),
    Column("is_primary", Boolean, nullable=False),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

# 20260929110000_forecast_market_regime (FC-REQ-010)
market_regime = Table(
    "market_regime",
    metadata,
    Column("symbol", Text, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("last_bar_at", DateTime(timezone=True), nullable=False),
    Column("close", Float, nullable=False),
    Column("sma_200d", Float),
    Column("trend_open", Boolean, nullable=False),
    Column("hmm_p_high", Float),
    Column("hmm_fit_at", DateTime(timezone=True)),
    Column("hmm_sigma_low", Float),
    Column("hmm_sigma_high", Float),
    Column("drawdown_365d", Float),
    Column("vol_ewma", Float),
    Column("gate_key", Text),
    Column("gate_open", Boolean, nullable=False),
    Column("event_factor", Float, nullable=False),
    Column("next_event_kind", Text),
    Column("next_event_at", DateTime(timezone=True)),
    Column("prereg_key", Text, nullable=False),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

# target-weight@2 [live] — 20260929130000_forecast_target_weight_live (FC-REQ-013)
target_weight_live_weight = Table(
    "target_weight_live_weight",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("universe", Text, primary_key=True),
    Column("target", Float, primary_key=True),
    Column("rebalance_at", DateTime(timezone=True), primary_key=True),
    Column("weights", JSONB, nullable=False),
    Column("sigma", JSONB, nullable=False),
    Column("exposure", Float, nullable=False),
    Column("recorded_at", DateTime(timezone=True), nullable=False),
)

target_weight_live_outcome = Table(
    "target_weight_live_outcome",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("universe", Text, primary_key=True),
    Column("target", Float, primary_key=True),
    Column("rebalance_at", DateTime(timezone=True), primary_key=True),
    Column("week_end", DateTime(timezone=True), nullable=False),
    Column("status", Text, nullable=False),
    Column("returns", JSONB, nullable=False),
    Column("strategy_log_return", Float),
    Column("btc_log_return", Float),
    Column("cost", Float),
    Column("recorded_at", DateTime(timezone=True), nullable=False),
)

target_weight_live_summary = Table(
    "target_weight_live_summary",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("universe", Text, primary_key=True),
    Column("target", Float, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("first_rebalance_at", DateTime(timezone=True), nullable=False),
    Column("n_weeks", Integer, nullable=False),
    Column("n_excluded", Integer, nullable=False),
    Column("cum_return", Float),
    Column("btc_cum_return", Float),
    Column("mdd", Float),
    Column("btc_mdd", Float),
    Column("vol", Float),
    Column("upside", Float),
    Column("downside", Float),
    Column("worst_weeks", JSONB, nullable=False),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

# 업비트 거래 유의 · 주의 스냅샷 — 20260930100000_forecast_market_warning (FC-REQ-014)
market_warning_snapshot = Table(
    "market_warning_snapshot",
    metadata,
    Column("symbol", Text, primary_key=True),
    Column("fetched_at", DateTime(timezone=True), primary_key=True),
    Column("warning", Boolean, nullable=False),
    Column("cautions", ARRAY(Text), nullable=False),
)

# 뉴스 원장 · 감성 점수(F010 슬라이스 6 3차 · FC-REQ-016 · 사전등록 news-sentiment@1). 둘 다 불변
news_item = Table(
    "news_item",
    metadata,
    Column("item_id", Text, primary_key=True),
    Column("source", Text, nullable=False),
    Column("lang", Text, nullable=False),
    Column("title", Text, nullable=False),
    Column("summary", Text),
    Column("url", Text, nullable=False),
    Column("title_key", Text, nullable=False),
    Column("published_at", DateTime(timezone=True), nullable=False),
    Column("fetched_at", DateTime(timezone=True), nullable=False),
)

news_score = Table(
    "news_score",
    metadata,
    Column("item_id", Text, primary_key=True),
    Column("model_version", Text, primary_key=True),
    Column("symbols", ARRAY(Text), nullable=False),
    Column("event_kinds", ARRAY(Text), nullable=False),
    Column("negated", Boolean, nullable=False),
    Column("p_pos", Float, nullable=False),
    Column("p_neu", Float, nullable=False),
    Column("p_neg", Float, nullable=False),
    Column("score", Float, nullable=False),
    Column("scored_at", DateTime(timezone=True), nullable=False),
)

# 운영 점검 결과(F010 슬라이스 7 · FC-REQ-018). (as_of 정시, subject) 마다 한 행 — 같은 시간 재실행은 덮어쓴다
ops_check = Table(
    "ops_check",
    metadata,
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("subject", Text, primary_key=True),
    Column("status", Text, nullable=False),
    Column("last_ok_at", DateTime(timezone=True)),
    Column("detail", Text),
    Column("checked_at", DateTime(timezone=True), nullable=False),
)

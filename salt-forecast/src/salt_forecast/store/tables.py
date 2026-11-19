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
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID

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

# 20261117120100_forecast_kr_earnings (DB-REQ-034 FR-5 · FC-REQ-021 FR-14) — 다음 실적 공시 예상 창 · 채점 · 확정 일정
kr_earnings_window = Table(
    "kr_earnings_window",
    metadata,
    Column("symbol", Text, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("period_end", Date, nullable=False),
    Column("annual", Boolean, nullable=False),
    Column("quarter_lag_min", Integer),
    Column("quarter_lag_median", Integer),
    Column("quarter_lag_max", Integer),
    Column("sample", Integer, nullable=False),
    Column("window_from", Date),
    Column("window_to", Date),
    Column("deadline", Date, nullable=False),
    Column("hits", Integer, nullable=False),
    Column("judged", Integer, nullable=False),
    Column("misses", JSONB, nullable=False),
    Column("confirmed_at", DateTime(timezone=True)),
    Column("confirmed_time_known", Boolean),
    Column("confirmed_source", Text),
    Column("renderable", Boolean, nullable=False),
    Column("blocked_reason", Text),
    Column("computed_at", DateTime(timezone=True), nullable=False),
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
    # 20261102140000_forecast_kr_market_events (DB-REQ-034 FR-2) — 시장 일정 '' · 종목 사건 = 종목 코드
    Column("symbol", Text, primary_key=True),
)

event_reaction = Table(
    "event_reaction",
    metadata,
    Column("kind", Text, primary_key=True),
    Column("event_at", DateTime(timezone=True), primary_key=True),
    Column("symbol", Text, primary_key=True),
    Column("event_symbol", Text, primary_key=True),
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

# 등락 분해 β · 평소 변동 σ — 20261109090000_forecast_move_beta (FC-REQ-027 FR-1~3). 서버는 v_move_beta_export 로 읽는다
move_beta = Table(
    "move_beta",
    metadata,
    Column("symbol", Text, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("asset_class", Text, nullable=False),
    Column("market_index", Text),
    Column("sector_index", Text),
    Column("beta_market", Float),
    Column("beta_sector", Float),
    Column("beta_sample", Integer, nullable=False),
    Column("sigma_daily", Float),
    Column("sigma_sample", Integer, nullable=False),
    Column("last_bar_at", DateTime(timezone=True)),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

# F017 v2 단계 2 — 20261111120000_forecast_base_rate (FC-REQ-028 FR-2 · DB-REQ-043 FR-3)
base_rate_stat = Table(
    "base_rate_stat",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("market", Text, primary_key=True),
    Column("condition_id", Text, primary_key=True),
    Column("horizon", Integer, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("kind", Text, nullable=False),
    Column("status", Text, nullable=False),
    Column("sample", Integer, nullable=False),
    Column("sample_eff", Float, nullable=False),
    Column("sample_days", Integer, nullable=False),
    Column("up_rate", Float),
    Column("up_rate_shrunk", Float),
    Column("up_low", Float),
    Column("up_high", Float),
    Column("mean", Float),
    Column("q10", Float),
    Column("q50", Float),
    Column("q90", Float),
    Column("hold_up_rate", Float),
    Column("hold_q10", Float),
    Column("hold_q50", Float),
    Column("hold_q90", Float),
    Column("p_holm", Float),
    Column("differs", Text),
    Column("recent_differs", Boolean),
    Column("window_start", Date, nullable=False),
    Column("window_end", Date, nullable=False),
    Column("computed_at", DateTime(timezone=True), nullable=False),
    Column("horizon_unit", Text, nullable=False),  # day(base-rate@1) · hour(base-rate@2)
)

base_rate_trigger = Table(
    "base_rate_trigger",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("market", Text, nullable=False),
    Column("symbol", Text, primary_key=True),
    Column("condition_id", Text, primary_key=True),
    Column("applies_to", Text, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("ref_close", Numeric, nullable=False),
    Column("ref_at", DateTime(timezone=True), nullable=False),
    Column("price_at_least", Numeric),
    Column("price_at_most", Numeric),
    Column("open_at_least", Numeric),
    Column("value_at_least", Numeric),
)

# F017 v2 단계 2 — 20261111140000_trade_check_export_and_outcome (FC-REQ-028 FR-4 점검 채점)
trade_check_outcome = Table(
    "trade_check_outcome",
    metadata,
    Column("ledger_id", Text, primary_key=True),
    Column("market", Text, nullable=False),
    Column("side", Text, nullable=False),
    Column("condition_id", Text, nullable=False),
    Column("horizon", Integer, nullable=False),
    Column("shown_up_rate", Float),
    Column("end_at", DateTime(timezone=True), nullable=False),
    Column("realized", Float, nullable=False),
    Column("went_up", Boolean, nullable=False),
    Column("scored_at", DateTime(timezone=True), nullable=False),
)

# F017 v2 단계 4 — 20261111160000_judgment_tier (FC-REQ-028 FR-6 · DB-REQ-043 FR-6)
judgment_tier = Table(
    "judgment_tier",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("run_as_of", DateTime(timezone=True), primary_key=True),
    Column("market", Text, primary_key=True),
    Column("mode", Text, primary_key=True),
    Column("rule_version", Text, nullable=False),
    Column("tier", Text, nullable=False),
    Column("reason", Text),
    Column("basis_source", Text),
    Column("live_rows", Integer, nullable=False),
    Column("live_days", Integer, nullable=False),
    Column("live_candidates", Integer, nullable=False),
    Column("live_avoids", Integer, nullable=False),
    Column("live_effective_n", Float, nullable=False),
    Column("live_spread", Float),
    Column("live_ci_low", Float),
    Column("live_ci_high", Float),
    Column("live_p_holm", Float),
    Column("regime_first", Float),
    Column("regime_second", Float),
    Column("backtest_spread", Float),
    Column("backtest_ci_low", Float),
    Column("backtest_ci_high", Float),
    Column("demoted_at", DateTime(timezone=True)),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

# 단타 방향 확률 — short-direction@1(FC-REQ-028 FR-1 · FR-4, 마이그레이션 20261111170000_short_horizon)
short_horizon_test = Table(
    "short_horizon_test",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("run_as_of", DateTime(timezone=True), primary_key=True),
    Column("market", Text, primary_key=True),
    Column("horizon", Text, primary_key=True),
    Column("model_version", Text),
    Column("status", Text, nullable=False),
    Column("blocked_reason", Text),
    Column("window_from", DateTime(timezone=True)),
    Column("window_to", DateTime(timezone=True)),
    Column("eval_rows", Integer, nullable=False),
    Column("bss", Float),
    Column("bss_ci_low", Float),
    Column("bss_ci_high", Float),
    Column("bss_p_holm", Float),
    Column("bss_persistence", Float),
    Column("ece", Float),
    Column("track_origin", Text, nullable=False),
    Column("confident_calls", Integer, nullable=False),
    Column("confident_hits", Integer, nullable=False),
    Column("always_up_hits", Integer, nullable=False),
    Column("hit_diff_ci_low", Float),
    Column("hit_diff_ci_high", Float),
    Column("net_mean", Float),
    Column("shuffle_ci_low", Float),
    Column("shuffle_ci_high", Float),
    Column("reliability", JSONB, nullable=False),
    Column("misses", JSONB, nullable=False),
    Column("z_quantiles", JSONB, nullable=False),
    Column("live_params", JSONB),
    Column("live_ready", Boolean, nullable=False),
    Column("bss_climatology", Float),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

short_horizon_prediction = Table(
    "short_horizon_prediction",
    metadata,
    Column("symbol", Text, primary_key=True),
    Column("horizon", Text, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("model_version", Text, primary_key=True),
    Column("prereg_key", Text, nullable=False),
    Column("market", Text, nullable=False),
    Column("p_up", Float, nullable=False),
    Column("q10", Float, nullable=False),
    Column("q50", Float, nullable=False),
    Column("q90", Float, nullable=False),
    Column("ref_price", Numeric, nullable=False),
    Column("invalidation", Numeric, nullable=False),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("available_at", DateTime(timezone=True), nullable=False),
    Column("p_ref", Float),
)

short_horizon_outcome = Table(
    "short_horizon_outcome",
    metadata,
    Column("symbol", Text, primary_key=True),
    Column("horizon", Text, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("model_version", Text, primary_key=True),
    Column("realized", Float, nullable=False),
    Column("up", Boolean, nullable=False),
    Column("scored_at", DateTime(timezone=True), nullable=False),
)

# 소식 측정 태그(F017 단계 6 · FC-REQ-028 FR-3 · DB-REQ-043 FR-4) — 마이그레이션 20261112100000_news_reaction
news_kind_dict = Table(
    "news_kind_dict",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("registered", Date, nullable=False),
    Column("dict", JSONB, nullable=False),
    Column("written_at", DateTime(timezone=True), nullable=False),
)

news_reaction_stat = Table(
    "news_reaction_stat",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("market", Text, primary_key=True),
    Column("origin", Text, primary_key=True),
    Column("kind", Text, primary_key=True),
    Column("horizon", SmallInteger, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("status", Text, nullable=False),
    Column("sample", Integer, nullable=False),
    Column("sample_eff", Float, nullable=False),
    Column("sample_days", Integer, nullable=False),
    Column("up_rate", Float),
    Column("up_low", Float),
    Column("up_high", Float),
    Column("mean", Float),
    Column("q10", Float),
    Column("q50", Float),
    Column("q90", Float),
    Column("pre_move_median", Float),
    Column("base_up_rate", Float),
    Column("differs", Text),
    Column("window_from", DateTime(timezone=True)),
    Column("window_to", DateTime(timezone=True)),
)

news_pre_move = Table(
    "news_pre_move",
    metadata,
    Column("market", Text, primary_key=True),
    Column("symbol", Text, primary_key=True),
    Column("bar_at", DateTime(timezone=True), primary_key=True),
    Column("pre_move_5d", Float, nullable=False),
    Column("written_at", DateTime(timezone=True), nullable=False),
)

# 사건 반응 창 · 선반영 삼분위(F017 v4 순서 3b · FC-REQ-028 FR-8 · 마이그레이션 20261116150000_forecast_event_window)
event_window = Table(
    "event_window",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("market", Text, primary_key=True),
    Column("origin", Text, primary_key=True),
    Column("kind", Text, primary_key=True),
    Column("symbol", Text, primary_key=True),
    Column("ref_at", DateTime(timezone=True), primary_key=True),
    Column("published_at", DateTime(timezone=True), nullable=False),
    Column("pre20", Float),
    Column("pre5", Float),
    Column("pre1", Float),
    Column("post30m", Float),
    Column("post1", Float),
    Column("post5", Float),
    Column("tercile", Text),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

event_window_stat = Table(
    "event_window_stat",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("market", Text, primary_key=True),
    Column("origin", Text, primary_key=True),
    Column("kind", Text, primary_key=True),
    Column("tercile", Text, primary_key=True),
    Column("horizon", Integer, primary_key=True),
    Column("as_of", DateTime(timezone=True), primary_key=True),
    Column("status", Text, nullable=False),
    Column("sample", Integer, nullable=False),
    Column("sample_eff", Float, nullable=False),
    Column("sample_days", Integer, nullable=False),
    Column("up_rate", Float),
    Column("up_low", Float),
    Column("up_high", Float),
    Column("mean", Float),
    Column("q10", Float),
    Column("q50", Float),
    Column("q90", Float),
    Column("pre5_median", Float),
    Column("base_up_rate", Float),
    Column("p_holm", Float),
    Column("differs", Text),
    Column("pre_low_max", Float, nullable=False),
    Column("pre_high_min", Float, nullable=False),
    Column("window_from", DateTime(timezone=True)),
    Column("window_to", DateTime(timezone=True)),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

# 예측 실험 H1 · H3 전진 시험(FC-REQ-028 FR-9 · DB-REQ-043 FR-14) — 20261116180000_forecast_experiment_h1_h3
vol_range_test = Table(
    "vol_range_test",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("market", Text, primary_key=True),
    Column("horizon", Integer, primary_key=True),
    Column("run_as_of", DateTime(timezone=True), primary_key=True),
    Column("model_version", Text),
    Column("status", Text, nullable=False),
    Column("reason", Text),
    Column("window_from", DateTime(timezone=True)),
    Column("window_to", DateTime(timezone=True)),
    Column("eval_rows", Integer, nullable=False),
    Column("eval_days", Integer, nullable=False),
    Column("excluded_nonpos", Integer, nullable=False),
    Column("qlike_har", Float),
    Column("qlike_b1", Float),
    Column("qlike_b2", Float),
    Column("qlike_b3", Float),
    Column("p_holm_b1", Float),
    Column("p_holm_b2", Float),
    Column("p_holm_b3", Float),
    Column("cover80", Float),
    Column("cover95", Float),
    Column("cover_rows", Integer, nullable=False),
    Column("cover_by_year", JSONB, nullable=False),
    Column("placebo_pass", Boolean, nullable=False),
    Column("forward", JSONB, nullable=False),
    Column("looks_done", Integer, nullable=False),
    Column("live_params", JSONB),
    Column("live_ready", Boolean, nullable=False),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

vol_range_prediction = Table(
    "vol_range_prediction",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("market", Text, primary_key=True),
    Column("horizon", Integer, primary_key=True),
    Column("symbol", Text, primary_key=True),
    Column("ref_at", DateTime(timezone=True), primary_key=True),
    Column("model_version", Text, nullable=False),
    Column("rv_har", Float, nullable=False),
    Column("rv_b1", Float),
    Column("rv_b2", Float),
    Column("rv_b3", Float),
    Column("half80", Float),
    Column("half95", Float),
    Column("recorded_at", DateTime(timezone=True), nullable=False),
    Column("realized_rv", Float),
    Column("realized_r", Float),
    Column("in_time", Boolean),
    Column("scored_at", DateTime(timezone=True)),
)

move_news_event = Table(
    "move_news_event",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("market", Text, primary_key=True),
    Column("symbol", Text, primary_key=True),
    Column("ref_at", DateTime(timezone=True), primary_key=True),
    Column("r", Float, nullable=False),
    Column("sigma", Float, nullable=False),
    Column("news_count", Integer, nullable=False),
    Column("volume_high", Boolean, nullable=False),
    Column("covered", Boolean, nullable=False),
    Column("source_ok", Boolean, nullable=False),
    Column("recorded_at", DateTime(timezone=True), nullable=False),
    Column("s1", Float),
    Column("s5", Float),
    Column("cost1", Float),
    Column("cost5", Float),
    Column("in_time1", Boolean),
    Column("in_time5", Boolean),
    Column("scored_at", DateTime(timezone=True)),
)

move_news_test = Table(
    "move_news_test",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("market", Text, primary_key=True),
    Column("horizon", Integer, primary_key=True),
    Column("test", Text, primary_key=True),
    Column("origin", Text, primary_key=True),
    Column("run_as_of", DateTime(timezone=True), primary_key=True),
    Column("status", Text, nullable=False),
    Column("reason", Text),
    Column("events", Integer, nullable=False),
    Column("days", Integer, nullable=False),
    Column("stat", Float),
    Column("t", Float),
    Column("p", Float),
    Column("p_holm", Float),
    Column("placebo_q95", Float),
    Column("placebo_pass", Boolean, nullable=False),
    Column("robust_same_sign", Boolean, nullable=False),
    Column("detail", JSONB, nullable=False),
    Column("looks_done", Integer, nullable=False),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

# ---- 온톨로지 네 층 · 원인 설명 채점(FC-REQ-022 FR-1~4 · 13 · 14 · 15 · F017 v4 순서 5) ----

entity = Table(
    "entity",
    metadata,
    Column("id", Text, primary_key=True),
    Column("kind", Text, nullable=False),
    Column("canonical_name", Text, nullable=False),
    Column("external_ids", JSONB, nullable=False),
    Column("merged_into", Text),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

relation = Table(
    "relation",
    metadata,
    Column("subject", Text, primary_key=True),
    Column("predicate", Text, primary_key=True),
    Column("object", Text, primary_key=True),
    Column("valid_from", DateTime(timezone=True), primary_key=True),
    Column("valid_to", DateTime(timezone=True)),
    Column("observed_at", DateTime(timezone=True), nullable=False),
    Column("available_at", DateTime(timezone=True), nullable=False),
    Column("ingested_at", DateTime(timezone=True), nullable=False),
    Column("source_kind", Text, nullable=False),
    Column("source_url", Text),
    Column("confidence", Float, nullable=False),
)

fact = Table(
    "fact",
    metadata,
    Column("entity", Text, primary_key=True),
    Column("attribute", Text, primary_key=True),
    Column("value_num", Numeric),  # 금액 · 비율 — numeric(db-contract §3)
    Column("value_text", Text),
    Column("unit", Text),
    Column("valid_from", DateTime(timezone=True), primary_key=True),
    Column("valid_to", DateTime(timezone=True)),
    Column("observed_at", DateTime(timezone=True), nullable=False),
    Column("available_at", DateTime(timezone=True), primary_key=True),
    Column("ingested_at", DateTime(timezone=True), nullable=False),
    Column("source_kind", Text, nullable=False),
    Column("source_url", Text),
)

cause_candidate = Table(
    "cause_candidate",
    metadata,
    Column("entity", Text, primary_key=True),
    Column("trade_date", Date, primary_key=True),
    Column("fingerprint", Text, primary_key=True),
    Column("rank", Integer, primary_key=True),
    Column("kind", Text, nullable=False),
    Column("strength", Text, nullable=False),
    Column("headline", Text, nullable=False),
    Column("event_entity", Text),
    Column("supports", Integer, nullable=False),
    Column("available_at", DateTime(timezone=True), nullable=False),
    Column("ingested_at", DateTime(timezone=True), nullable=False),
)

evidence = Table(
    "evidence",
    metadata,
    Column("entity", Text, primary_key=True),
    Column("trade_date", Date, primary_key=True),
    Column("fingerprint", Text, primary_key=True),
    Column("rank", Integer, primary_key=True),
    Column("ord", Integer, primary_key=True),
    Column("kind", Text, nullable=False),
    Column("value_text", Text, nullable=False),
    Column("compare_text", Text),
    Column("supports", Boolean, nullable=False),
    Column("source_name", Text, nullable=False),
    Column("observed_at", DateTime(timezone=True)),
    Column("available_at", DateTime(timezone=True), nullable=False),
)

outcome = Table(
    "outcome",
    metadata,
    Column("entity", Text, primary_key=True),
    Column("trade_date", Date, primary_key=True),
    Column("horizon", Integer, primary_key=True),
    Column("r", Float, nullable=False),
    Column("r_market", Float, nullable=False),
    Column("excess", Float, nullable=False),
    Column("available_at", DateTime(timezone=True), nullable=False),
    Column("ingested_at", DateTime(timezone=True), nullable=False),
)

cause_explain_test = Table(
    "cause_explain_test",
    metadata,
    Column("prereg_key", Text, primary_key=True),
    Column("market", Text, primary_key=True),
    Column("horizon", Integer, primary_key=True),
    Column("run_as_of", DateTime(timezone=True), primary_key=True),
    Column("status", Text, nullable=False),
    Column("reason", Text),
    Column("rows_scored", Integer, nullable=False),
    Column("rows_cold", Integer, nullable=False),
    Column("days", Integer, nullable=False),
    Column("brier_kind", Float),
    Column("brier_base", Float),
    Column("skill", Float),
    Column("t", Float),
    Column("p", Float),
    Column("p_holm", Float),
    Column("detail", JSONB, nullable=False),
    Column("looks_done", Integer, nullable=False),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

entity_alias = Table(
    "entity_alias",
    metadata,
    Column("entity", Text, primary_key=True),
    Column("alias", Text, primary_key=True),
    Column("alias_kind", Text, nullable=False),
    Column("source_kind", Text, nullable=False),
    Column("available_at", DateTime(timezone=True), nullable=False),
    Column("ingested_at", DateTime(timezone=True), nullable=False),
)

# 개인 재무 구간 채점 O4 — 20261118100000_forecast_personal_projection (FC-REQ-024 FR-1 · 3). 사람은 해시뿐 · 금액 0.
# 서비스는 v_personal_coverage · v_price_index 만 읽는다
personal_projection = Table(
    "personal_projection",
    metadata,
    Column("issuance_id", UUID(as_uuid=False), primary_key=True),
    Column("kind", Text, nullable=False),
    Column("subject_hash", Text, nullable=False),
    Column("series_key", Text, nullable=False),
    Column("issued_at", DateTime(timezone=True), nullable=False),
    Column("method", Text, nullable=False),
    Column("reason", Text),
    Column("history_n", Integer, nullable=False),
    Column("has_interval", Boolean, nullable=False),
    Column("early_month", Date),
    Column("late_month", Date),
    Column("include_interest", Boolean),
    Column("target_month", Date),
    Column("days_left", Integer),
    Column("first_seen_at", DateTime(timezone=True), nullable=False),
)

personal_projection_score = Table(
    "personal_projection_score",
    metadata,
    Column("issuance_id", UUID(as_uuid=False), primary_key=True),
    Column("outcome", Text, nullable=False),
    Column("decided_on", Date, nullable=False),
    Column("counted", Boolean, nullable=False),
    Column("scored_at", DateTime(timezone=True), nullable=False),
)

# O2 관문(FC-REQ-022 FR-11 · FC-REQ-023 FR-6) — 20261118200000_forecast_agent_tools.
# ontology_quality 회차마다 시장별 한 행.
# 서버 에이전트 도구는 f_agent_mentions_ok(market, as_of) 로 읽는다(마지막 관문이 미달이면 mentions 간선을 쓰지 않는다)
ontology_quality_gate = Table(
    "ontology_quality_gate",
    metadata,
    Column("checked_at", DateTime(timezone=True), primary_key=True),
    Column("market", Text, primary_key=True),
    Column("precision", Float, nullable=False),
    Column("recall", Float, nullable=False),
    Column("ok", Boolean, nullable=False),
    Column("labels", Text, nullable=False),
)

# 밸류에이션 밴드 적립(FC-REQ-029 · band-accumulation@2) — 자산 × 이번 주 결정일 한 행.
# 서버 plan 은 뷰 `v_accumulation_band` 만 읽는다
accumulation_band = Table(
    "accumulation_band",
    metadata,
    Column("asset", Text, primary_key=True),
    Column("plan_week", DateTime(timezone=True), primary_key=True),
    Column("prereg_key", Text, primary_key=True),
    Column("indicator", Text, nullable=False),
    Column("indicator_value", Float),
    Column("percentile", Float),
    Column("estimated", Boolean, nullable=False),
    Column("basis_observed", DateTime(timezone=True)),
    Column("secondary_value", Float),
    Column("band_key", Text),
    Column("band_multiplier", Float),
    Column("gate_passed", Boolean, nullable=False),
    Column("blocked_reason", Text),
    Column("multiplier", Float, nullable=False),
    Column("closed_weeks", Integer, nullable=False),
    Column("excess", Float),
    Column("ci_low", Float),
    Column("ci_high", Float),
    Column("years_total", Integer, nullable=False),
    Column("years_positive", Integer, nullable=False),
    Column("window_from", DateTime(timezone=True)),
    Column("window_to", DateTime(timezone=True)),
    Column("failure_cases", JSONB, nullable=False),
    Column("failure_count", Integer, nullable=False),
    Column("kimchi_premium", Float),
    Column("kimchi_as_of", DateTime(timezone=True)),
    Column("computed_at", DateTime(timezone=True), nullable=False),
)

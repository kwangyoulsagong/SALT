"""core 모델 포트폴리오 라이브 원장 — 사전등록 target-weight@2 [live] (FC-REQ-013).

리밸런스 날 t 마다 비중을 정하고(t 종가까지 읽는다), t+7 봉이 마감하면 그 주 결과를 정한다. 여기서는 **무엇을 써야
하는지만** 계산한다 — 이미 저장된 행과의 대조 · 쓰기는 작업이 `store.target_weight_live` 로 한다.
원장은 불변이라, 다시 계산한 값이 저장값과 다르면(봉 보정) 작업이 실패해야 한다 — `same_weights` 가 그 비교다.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.labels import ewma_sigma
from salt_forecast.domain.panel import Panel, build_panel
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.domain.target_weight import LiveSummary, live_summary, target_weights, week_outcome
from salt_forecast.scoring.target_weight import BTC, CORE, TARGETS, monday_rows

LIVE_START = datetime(2026, 10, 5, tzinfo=UTC)
LATE_AFTER = timedelta(hours=24)
UNIVERSE = "core"
WEEK = 7
TOL = 1e-9

type Vec = NDArray[np.float64]


@dataclass(frozen=True, slots=True)
class WeightRow:
    target: float
    rebalance_at: datetime
    weights: dict[str, float]
    sigma: dict[str, float]

    @property
    def exposure(self) -> float:
        return float(sum(self.weights.values()))


@dataclass(frozen=True, slots=True)
class OutcomeRow:
    target: float
    rebalance_at: datetime
    week_end: datetime
    status: str  # ok · late · missing_bar
    returns: dict[str, float]
    strategy_log_return: float | None
    btc_log_return: float | None
    cost: float | None


@dataclass(frozen=True, slots=True)
class SummaryRow:
    target: float
    as_of: datetime
    first_rebalance_at: datetime
    n_excluded: int
    summary: LiveSummary
    worst_weeks: list[dict[str, float | str]]


def _at(epoch: int) -> datetime:
    return datetime.fromtimestamp(epoch, UTC)


def live_panel(ohlcv: Mapping[str, OhlcvSeries], as_of: datetime) -> Panel:
    first = min(int(ohlcv[s].available_at[0]) for s in CORE if s in ohlcv and ohlcv[s].available_at.size)
    return build_panel({s: ohlcv[s] for s in CORE if s in ohlcv}, first, int(as_of.timestamp()))


def weight_rows(panel: Panel, as_of: datetime, start: datetime = LIVE_START) -> list[WeightRow]:
    """start 이후 · as_of 까지 마감한 월요일 봉마다 5개 목표 비중. core 봉 · σ 가 둘 다 있는 월요일만."""
    for s in CORE:
        if s not in panel.symbols:
            raise ValueError(f"{s} 일봉이 없다")
    sigma = ewma_sigma(panel) * np.sqrt(365.0)
    cols = [panel.column(s) for s in CORE]
    ok = monday_rows(panel.dates) & (panel.dates >= int(start.timestamp())) & (panel.dates <= int(as_of.timestamp()))
    # 봉 · σ 가 아직 없는 월요일은 쓰지 않는다 — 수집 전에 돌면 비중 0 행이 불변 원장에 박힌다. 다음 실행이 쓴다
    ok &= np.isfinite(panel.close[:, cols]).all(axis=1) & np.isfinite(sigma[:, cols]).all(axis=1)
    out: list[WeightRow] = []
    for t in np.flatnonzero(ok):
        sig = sigma[t, cols]
        for target in TARGETS:
            w = target_weights(sig, target)
            out.append(
                WeightRow(
                    target=target,
                    rebalance_at=_at(int(panel.dates[t])),
                    weights={s: float(w[i]) for i, s in enumerate(CORE)},
                    sigma={s: float(sig[i]) for i, s in enumerate(CORE) if np.isfinite(sig[i])},
                )
            )
    return out


def same_weights(a: Mapping[str, float], b: Mapping[str, float]) -> bool:
    keys = set(a) | set(b)
    return all(abs(a.get(k, 0.0) - b.get(k, 0.0)) <= TOL for k in keys)


def outcome_rows(
    panel: Panel,
    weights: Sequence[WeightRow],
    recorded_at: Mapping[tuple[float, datetime], datetime],
    as_of: datetime,
) -> list[OutcomeRow]:
    """t+7 봉이 as_of 까지 마감한 주의 결과. 비용은 목표별로 지난주가 흘러간 비중 기준(첫 주는 현금 → 비중)."""
    index = {int(d): i for i, d in enumerate(panel.dates)}
    end = int(as_of.timestamp())
    out: list[OutcomeRow] = []
    by_target: dict[float, list[WeightRow]] = {}
    for w in weights:
        by_target.setdefault(w.target, []).append(w)
    for target, rows in by_target.items():
        drifted = np.zeros(len(CORE))
        for w in sorted(rows, key=lambda r: r.rebalance_at):
            t0 = int(w.rebalance_at.timestamp())
            t1 = t0 + WEEK * DAY
            vec = np.array([w.weights.get(s, 0.0) for s in CORE])
            if t1 > end:
                break
            i0, i1 = index.get(t0), index.get(t1)
            closes = [
                (panel.close[i0, panel.column(s)], panel.close[i1, panel.column(s)])
                if i0 is not None and i1 is not None
                else (np.nan, np.nan)
                for s in CORE
            ]
            returns = {s: float(c1 / c0 - 1.0) for s, (c0, c1) in zip(CORE, closes, strict=True) if c0 > 0 and c1 > 0}
            needed = [s for i, s in enumerate(CORE) if vec[i] > 0] + [BTC]
            week_end = _at(t1)
            if any(s not in returns for s in needed):
                out.append(OutcomeRow(target, w.rebalance_at, week_end, "missing_bar", returns, None, None, None))
                drifted = vec  # 흘러간 값을 모른다 — 다음 주 비용은 이번 주 목표 기준(보수적이지도 유리하지도 않다)
                continue
            r = np.array([returns.get(s, 0.0) for s in CORE])
            wk = week_outcome(drifted, vec, r)
            drifted = wk.drifted
            late = recorded_at.get((target, w.rebalance_at), w.rebalance_at) > w.rebalance_at + LATE_AFTER
            out.append(
                OutcomeRow(
                    target,
                    w.rebalance_at,
                    week_end,
                    "late" if late else "ok",
                    returns,
                    wk.log_r,
                    float(np.log1p(returns[BTC])),
                    wk.cost,
                )
            )
    return out


def summaries(
    weights: Sequence[WeightRow], outcomes: Sequence[OutcomeRow], exposure: Mapping[tuple[float, datetime], float]
) -> list[SummaryRow]:
    """목표별 요약 — 결과가 없어도 첫 리밸런스가 있으면 한 행(n_weeks 0 · '라이브 채점 중 0/30주')."""
    out: list[SummaryRow] = []
    for target in TARGETS:
        ws = sorted((w for w in weights if w.target == target), key=lambda w: w.rebalance_at)
        if not ws:
            continue
        os_ = sorted((o for o in outcomes if o.target == target), key=lambda o: o.rebalance_at)
        ok = [o for o in os_ if o.status == "ok"]
        s_log = np.array([o.strategy_log_return for o in ok], dtype=np.float64)
        b_log = np.array([o.btc_log_return for o in ok], dtype=np.float64)
        summ = live_summary(s_log, b_log)
        worst: list[dict[str, float | str]] = [
            {
                "rebalance_at": ok[i].rebalance_at.isoformat(),
                "strategy": float(np.expm1(s_log[i])),
                "btc": float(np.expm1(b_log[i])),
                "exposure": exposure.get((target, ok[i].rebalance_at), float("nan")),
            }
            for i in summ.worst
        ]
        as_of = os_[-1].week_end if os_ else ws[0].rebalance_at
        out.append(SummaryRow(target, as_of, ws[0].rebalance_at, len(os_) - len(ok), summ, worst))
    return out

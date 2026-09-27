"""규칙 항목별 IC 백테스트 — 사전등록 rule-ic@1 을 그대로 실행한다(FC-REQ-008 FR-6 · FR-7).

한 번 읽고(일봉 · 공포탐욕 · 대형 체결 · 펀딩 · 테이커) 패널로 맞춘 뒤, 신호 × 라벨마다 **날짜별 IC 를 한 번** 계산하고
국면(BTC 200일선 위 · 아래)은 날짜 마스크만 바꿔 요약한다.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, date, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.domain.flow import net_ratio
from salt_forecast.domain.ic import (
    IcResult,
    block_bootstrap_spearman,
    block_length,
    cross_sectional_ic,
    summarize_cross_section,
    verdict,
)
from salt_forecast.domain.labels import class_ratio, ewma_sigma, triple_barrier
from salt_forecast.domain.panel import (
    Mat,
    Panel,
    age_days,
    align_points,
    build_panel,
    forward_log_return,
    lag,
    rolling_sum,
    window_mean,
)
from salt_forecast.domain.rule_items import MODES, contributions
from salt_forecast.domain.series import DAY, OhlcvSeries

MIN_AGE_DAYS = 60
BTC = "KRW-BTC"
REGIMES = ("all", "btc_above_200d", "btc_below_200d")
# 도전자의 기대 부호 — 사전등록 [exploratory] 주석. 펀딩 쏠림은 역방향
CHALLENGER_SIGN = {"funding_7d": -1}


@dataclass(frozen=True, slots=True)
class Primary:
    item: str
    mode: str
    horizon_days: int
    expected_sign: int = 1


@dataclass(frozen=True, slots=True)
class Protocol:
    primaries: tuple[Primary, ...]
    horizons: tuple[int, ...]
    label_kinds: tuple[str, ...]
    min_dates: int


@dataclass(slots=True)
class RunOutput:
    window: tuple[date, date]
    results: dict[str, list[IcResult]] = field(default_factory=dict[str, list[IcResult]])  # regime → 결과
    barrier_ratio: dict[int, tuple[float, float, float]] = field(default_factory=dict[int, tuple[float, float, float]])
    universe_mean: float = float("nan")
    whale_symbols: int = 0


def _matrix(panel: Panel, per_symbol: Mapping[str, NDArray[np.float64]]) -> Mat:
    out = np.full(panel.shape, np.nan)
    for sym, col in per_symbol.items():
        if sym in panel.symbols:
            out[:, panel.column(sym)] = col
    return out


def _base(symbol: str) -> str:
    return symbol.removeprefix("KRW-")


def build_signals(
    panel: Panel, series: Mapping[str, VintagedSeries]
) -> tuple[dict[str, dict[str, Mat]], NDArray[np.float64], int]:
    """(신호 이름 → 모드 → 행렬, 공포탐욕 격자, 대형 체결 종목 수). 모드 'any' 는 모드와 무관한 도전자."""
    d = panel.dates
    fg_s = series.get("fear_greed")
    fg = align_points(fg_s.available, fg_s.value, d, 2 * DAY) if fg_s else np.full(d.size, np.nan)

    def per_base(prefix: str, fn: str, window: int, max_age: int = 2 * DAY) -> Mat:
        cols: dict[str, NDArray[np.float64]] = {}
        for sym in panel.symbols:
            s = series.get(f"{prefix}:{_base(sym)}")
            if s is None:
                continue
            if fn == "mean":
                cols[sym] = window_mean(s.available, s.value, d, window)
            else:
                cols[sym] = align_points(s.available, s.value, d, max_age)
        return _matrix(panel, cols)

    wb = per_base("whale_buy_usd", "last", 0, DAY)
    ws = per_base("whale_sell_usd", "last", 0, DAY)
    whale_symbols = int(np.any(~np.isnan(wb), axis=0).sum())
    c = contributions(panel, fg, wb, ws)

    signals: dict[str, dict[str, Mat]] = {k: {m: v[m] for m in MODES} for k, v in c.by_item.items()}
    rule_only = [k for k in c.by_item if k != "whale_flow"]
    signals["total_score"] = {
        m: np.clip(50.0 + np.sum([c.by_item[k][m] for k in rule_only], axis=0), 0.0, 100.0) for m in MODES
    }
    signals["total_score_whale"] = {m: c.total(m) for m in MODES}

    with np.errstate(divide="ignore", invalid="ignore"):
        mom = np.log(lag(panel.close, 1) / lag(panel.close, 28))
    b7, s7 = rolling_sum(wb, 7), rolling_sum(ws, 7)
    whale_net = np.vectorize(net_ratio, otypes=[np.float64])(b7, s7)
    signals["mom_28d"] = {"any": mom}
    signals["funding_7d"] = {"any": per_base("funding", "mean", 7 * DAY)}
    signals["taker_buy_ratio_7d"] = {"any": per_base("taker_buy_ratio", "mean", 7 * DAY)}
    signals["whale_net_7d"] = {"any": whale_net}
    return signals, fg, whale_symbols


def btc_regime(panel: Panel) -> dict[str, NDArray[np.bool_]]:
    all_ = np.ones(panel.dates.size, dtype=bool)
    if BTC not in panel.symbols:
        return {"all": all_}
    close = panel.close[:, [panel.column(BTC)]]
    ma = rolling_sum(close, 200)[:, 0] / 200.0
    c = close[:, 0]
    return {"all": all_, "btc_above_200d": c > ma, "btc_below_200d": c < ma}


def run(
    ohlcv: Mapping[str, OhlcvSeries],
    series: Mapping[str, VintagedSeries],
    protocol: Protocol,
    start: datetime,
    as_of: datetime,
) -> RunOutput:
    t_end = int(as_of.timestamp())
    panel = build_panel({s: o.as_of(t_end) for s, o in ohlcv.items()}, int(start.timestamp()), t_end)
    signals, fg, whale_symbols = build_signals(panel, series)
    universe = (age_days(panel) >= MIN_AGE_DAYS) & ~np.isnan(panel.close)
    regimes = btc_regime(panel)
    sigma = ewma_sigma(panel)
    primary_keys = {(p.item, p.mode, p.horizon_days) for p in protocol.primaries}
    signs = {(p.item, p.mode, p.horizon_days): p.expected_sign for p in protocol.primaries}

    out = RunOutput(
        window=(_day(panel.dates[0]), _day(panel.dates[-1])),
        universe_mean=float(universe.sum(axis=1)[universe.sum(axis=1) > 0].mean()),
        whale_symbols=whale_symbols,
    )
    for r in REGIMES:
        out.results[r] = []
    for h in protocol.horizons:
        fixed = forward_log_return(panel, h)
        bar = triple_barrier(panel, h, sigma)
        out.barrier_ratio[h] = class_ratio(np.where(universe, bar.label, np.nan))
        labels = {"fixed": fixed, "barrier": bar.label}
        for kind in protocol.label_kinds:
            y = labels[kind]
            for item, by_mode in signals.items():
                for mode, sig in by_mode.items():
                    daily = cross_sectional_ic(sig, y, universe)
                    obs = np.sum(universe & ~np.isnan(sig) & ~np.isnan(y), axis=1).astype(np.float64)
                    m = "any" if mode == "any" else mode
                    key = (item, m, h)
                    for r, mask in regimes.items():
                        res = summarize_cross_section(
                            item,
                            m,
                            h,
                            kind,
                            np.where(mask, daily, np.nan),
                            obs,
                            primary=kind == "fixed" and r == "all" and key in primary_keys,
                            expected_sign=signs.get(key, CHALLENGER_SIGN.get(item, 1)),
                        )
                        out.results[r].append(res)
            # 공포탐욕 — 시장 공통 값이라 시계열 IC(값 vs 동일가중 시장 지평 수익률)
            market = np.nanmean(np.where(universe, y, np.nan), axis=1) if kind == "fixed" else None
            if market is not None:
                for r, mask in regimes.items():
                    x = np.where(mask, fg, np.nan)
                    ic, lo, hi, n = block_bootstrap_spearman(x, market, max(60, block_length(h)))
                    key = ("fear_greed", "market", h)
                    sign = signs.get(key, -1)
                    out.results[r].append(
                        IcResult(
                            "fear_greed",
                            "market",
                            h,
                            kind,
                            "time_series",
                            n,
                            1.0,
                            ic,
                            lo,
                            hi,
                            float("nan"),
                            verdict(n, lo, hi, sign, protocol.min_dates),
                            r == "all" and key in primary_keys,
                        )
                    )
    return out


def _day(epoch: int) -> date:
    return datetime.fromtimestamp(int(epoch), tz=UTC).date()


_VERDICT_KO = {"keep": "유지", "reverse": "반대", "zero_weight": "가중 0", "insufficient": "보류"}


def _fmt(x: float, pct: bool = False) -> str:
    if x != x:
        return "—"
    return f"{x:+.3f}" if not pct else f"{x * 100:.0f}%"


def render_report(key: str, git_sha: str, as_of: datetime, out: RunOutput) -> str:
    """리포트 — 1차 검정 판정표가 먼저, 탐색은 뒤. 선별 없이 전부 싣는다."""
    lines = [
        f"# 규칙 항목별 IC — {key} ({as_of.date().isoformat()})",
        "",
        f"- 사전등록: `salt-forecast/preregistration/2026-09-27-rule-ic.toml` · 실행 커밋 `{git_sha}`",
        f"- 창: {out.window[0]} ~ {out.window[1]} (as_of 매일) · 날짜당 평균 종목 {out.universe_mean:.0f}"
        f" · 대형 체결 종목 {out.whale_symbols}",
        "- 표본 선택: 지금 업비트 원화 마켓에 있는 종목(상장폐지 종목 없음 — **생존 편향**, IC 는 위로 치우칠 수 있다)",
        "- IC = 날짜별 종목 간 스피어만의 평균. CI = 날짜 이동 블록 부트스트랩 95%. t 는 겹침 무시 참고값",
        "",
        "## 1차 검정 (판정)",
        "",
        "| 항목 | 모드 | 지평 | 날짜 | IC | 95% CI | 판정 |",
        "|---|---|---|---|---|---|---|",
    ]
    rows = out.results["all"]
    for r in (x for x in rows if x.primary):
        lines.append(
            f"| {r.item} | {r.mode} | {r.horizon_days}일 | {r.n_dates} | {_fmt(r.ic_mean)} |"
            f" [{_fmt(r.ci_low)}, {_fmt(r.ci_high)}] | **{_VERDICT_KO[r.verdict]}** |"
        )
    lines += ["", "## 삼중 장벽 클래스 비율 (+1 / 0 / −1)", ""]
    for h, (u, z, dn) in out.barrier_ratio.items():
        flag = "" if all(0.2 <= v <= 0.6 for v in (u, z, dn)) else " — 20~60% 밖(장벽 재설정 검토)"
        lines.append(f"- {h}일: {_fmt(u, True)} / {_fmt(z, True)} / {_fmt(dn, True)}{flag}")
    for regime in REGIMES:
        lines += [
            "",
            f"## 탐색 — 국면 `{regime}`",
            "",
            "| 항목 | 모드 | 지평 | 라벨 | 날짜 | 종목 | IC | 95% CI | t | 판정(참고) |",
            "|---|---|---|---|---|---|---|---|---|---|",
        ]
        for r in out.results[regime]:
            lines.append(
                f"| {r.item} | {r.mode} | {r.horizon_days} | {r.label_kind} | {r.n_dates} | {r.mean_obs:.0f} |"
                f" {_fmt(r.ic_mean)} | [{_fmt(r.ci_low)}, {_fmt(r.ci_high)}] | {_fmt(r.t_naive)} |"
                f" {_VERDICT_KO[r.verdict]} |"
            )
    return "\n".join(lines) + "\n"

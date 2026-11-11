"""규칙 항목별 IC — 국내 주식(사전등록 rule-ic-kr@1, FC-REQ-028 FR-6 · F017 v2 단계 1b).

코인 rule-ic@1(`scoring/rule_ic.py`)과 같은 프로토콜을 **거래일 격자**에서 돌린다. 다른 것:
- 행 = 거래일(국내는 주말 · 휴장일에 봉이 없다 — 달력 하루 격자면 1일 라벨이 금 → 토로 비어 버린다)
- 대상 = kr-universe@1(봉 ≥ 250 · 20 거래일 연속 봉 · 20일 평균 거래대금 ≥ 10억)
- 상향 끊김(domain/kr_breaks) — 신호 창에 걸리면 그날 제외, 라벨 창에 걸리면 라벨 없음
- 심리 · 대형 체결은 국내 판단 재료가 아니라 재지 않는다. 국면은 domain/kr_regime(공개 일정)
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, date, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.ic import IcResult, cross_sectional_ic, summarize_cross_section
from salt_forecast.domain.kr_breaks import KRX_UP_BREAK_RATIO
from salt_forecast.domain.kr_regime import HIGH_VOL_2026, NORMAL, SHORT_BAN, kr_regime
from salt_forecast.domain.kr_universe import RULE as KR_UNIVERSE
from salt_forecast.domain.labels import class_ratio, ewma_sigma, triple_barrier
from salt_forecast.domain.panel import Mat, Panel, build_panel, forward_log_return, lag, rolling_sum
from salt_forecast.domain.rule_items import MODES, contributions
from salt_forecast.domain.series import OhlcvSeries
from salt_forecast.scoring.rule_ic import Protocol

RULE_VERSION = "mode-decision@2"
# 국면 열 이름(저장용 ASCII) ← kr_regime 라벨
REGIME_KEYS: dict[str, str] = {NORMAL: "kr_normal", SHORT_BAN: "kr_short_ban", HIGH_VOL_2026: "kr_high_vol_2026"}
REGIMES = ("all", *REGIME_KEYS.values())
SIGNAL_WINDOW = 14  # RSI 창 — 신호가 보는 봉 수
KR_CLOSE_UTC_OFFSET = 7 * 3600  # kis available_at = 16:00 KST = 07:00 UTC


@dataclass(slots=True)
class KrRunOutput:
    window: tuple[date, date]
    results: dict[str, list[IcResult]] = field(default_factory=dict[str, list[IcResult]])
    barrier_ratio: dict[int, tuple[float, float, float]] = field(default_factory=dict[int, tuple[float, float, float]])
    universe_mean: float = float("nan")
    sessions: int = 0


def session_panel(ohlcv: Mapping[str, OhlcvSeries], start: int, end: int) -> Panel:
    """거래일 격자 패널. 봉 시각(07:00 UTC)을 그날 00:00 UTC 로 옮겨 하루 격자를 만든 뒤 **봉이 하나도 없는 날을 뺀다**.
    `listed_at` 은 거래일 행 번호(격자 전 상장은 음수가 아니라 0 — 대상 판정은 봉 수로 한다)."""
    shifted = {
        s: OhlcvSeries(s, o.available_at - KR_CLOSE_UTC_OFFSET, o.open, o.high, o.low, o.close, o.volume)
        for s, o in ohlcv.items()
    }
    p = build_panel(shifted, start - KR_CLOSE_UTC_OFFSET, end - KR_CLOSE_UTC_OFFSET)
    keep = np.any(~np.isnan(p.close), axis=1)
    rows = np.flatnonzero(keep)
    has = ~np.isnan(p.close[rows])
    first = np.where(has.any(axis=0), has.argmax(axis=0), rows.size).astype(np.int64)
    return Panel(
        p.dates[rows] + KR_CLOSE_UTC_OFFSET, p.symbols, p.high[rows], p.low[rows], p.close[rows], p.volume[rows], first,
        None if p.open is None else p.open[rows],
    )  # fmt: skip


def up_breaks(p: Panel) -> NDArray[np.bool_]:
    """행 × 종목 — 직전 거래일 봉 대비 상향 끊김(> 1.31). 직전 봉이 없으면 False."""
    with np.errstate(divide="ignore", invalid="ignore"):
        ratio = p.close / lag(p.close, 1)
    return np.nan_to_num(ratio, nan=0.0) > KRX_UP_BREAK_RATIO


def kr_universe(p: Panel, breaks: NDArray[np.bool_]) -> NDArray[np.bool_]:
    """kr-universe@1 + 신호 창 끊김 제외. 봉 수는 패널 시작부터 센다(패널 = 원천 전 이력)."""
    rule = KR_UNIVERSE
    bars = np.cumsum(~np.isnan(p.close), axis=0)
    turnover = p.close * p.volume
    mean_turnover = rolling_sum(turnover, rule.window_sessions) / rule.window_sessions  # 창에 빈 봉이 있으면 NaN
    recent_break = rolling_sum(breaks.astype(np.float64), SIGNAL_WINDOW + 1) > 0
    return (
        (bars >= rule.min_bars)
        & (np.nan_to_num(mean_turnover, nan=0.0) >= rule.min_turnover_krw)
        & ~recent_break
        & ~np.isnan(p.close)
    )


def label_without_breaks(label: Mat, breaks: NDArray[np.bool_], h: int) -> Mat:
    """라벨 창 (t, t+h] 에 끊김이 있으면 NaN — 다른 기준의 두 가격을 잇는 수익률을 쓰지 않는다."""
    b = breaks.astype(np.float64)
    csum = np.vstack([np.zeros((1, b.shape[1])), np.cumsum(b, axis=0)])
    n = b.shape[0]
    idx: NDArray[np.int64] = np.arange(n, dtype=np.int64)
    hi = np.minimum(idx + h, n - 1)
    ahead = csum[hi + 1] - csum[idx + 1]
    return np.where(ahead > 0, np.nan, label)


def kr_regimes(p: Panel) -> dict[str, NDArray[np.bool_]]:
    labels = np.array([kr_regime(int(t)) for t in p.dates])
    out = {"all": np.ones(p.dates.size, dtype=bool)}
    for name, key in REGIME_KEYS.items():
        out[key] = labels == name
    return out


def build_kr_signals(p: Panel) -> dict[str, dict[str, Mat]]:
    """국내 신호 — 24시간 변화 · 일봉 RSI · 합계(심리 · 대형 체결 없음). 단타 RSI 는 일봉 대리."""
    fg = np.full(p.dates.size, np.nan)
    c = contributions(p, fg, version=RULE_VERSION)
    items = {k: c.by_item[k] for k in ("change24h", "rsi_d1")}
    signals: dict[str, dict[str, Mat]] = {k: {m: v[m] for m in MODES} for k, v in items.items()}
    signals["total_score"] = {m: np.clip(50.0 + items["change24h"][m] + items["rsi_d1"][m], 0.0, 100.0) for m in MODES}
    with np.errstate(divide="ignore", invalid="ignore"):
        signals["mom_20d"] = {"any": np.log(lag(p.close, 1) / lag(p.close, 20))}
    return signals


def run_kr(ohlcv: Mapping[str, OhlcvSeries], protocol: Protocol, start: datetime, as_of: datetime) -> KrRunOutput:
    t_end = int(as_of.timestamp())
    panel = session_panel({s: o.as_of(t_end) for s, o in ohlcv.items()}, int(start.timestamp()), t_end)
    breaks = up_breaks(panel)
    universe = kr_universe(panel, breaks)
    regimes = kr_regimes(panel)
    sigma = ewma_sigma(panel)
    signals = build_kr_signals(panel)
    primary_keys = {(p.item, p.mode, p.horizon_days) for p in protocol.primaries}
    signs = {(p.item, p.mode, p.horizon_days): p.expected_sign for p in protocol.primaries}
    counts = universe.sum(axis=1)
    out = KrRunOutput(
        window=(_day(panel.dates[0]), _day(panel.dates[-1])),
        universe_mean=float(counts[counts > 0].mean()) if np.any(counts > 0) else float("nan"),
        sessions=int(panel.dates.size),
    )
    for r in REGIMES:
        out.results[r] = []
    for h in protocol.horizons:
        fixed = label_without_breaks(forward_log_return(panel, h), breaks, h)
        bar = triple_barrier(panel, h, sigma)
        barrier = label_without_breaks(bar.label, breaks, h)
        out.barrier_ratio[h] = class_ratio(np.where(universe, barrier, np.nan))
        labels = {"fixed": fixed, "barrier": barrier}
        for kind in protocol.label_kinds:
            y = labels[kind]
            for item, by_mode in signals.items():
                for mode, sig in by_mode.items():
                    daily = cross_sectional_ic(sig, y, universe)
                    obs = np.sum(universe & ~np.isnan(sig) & ~np.isnan(y), axis=1).astype(np.float64)
                    key = (item, mode, h)
                    for r, mask in regimes.items():
                        out.results[r].append(
                            summarize_cross_section(
                                item,
                                mode,
                                h,
                                kind,
                                np.where(mask, daily, np.nan),
                                obs,
                                primary=kind == "fixed" and r == "all" and key in primary_keys,
                                expected_sign=signs.get(key, 1),
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


def render_kr_report(key: str, git_sha: str, as_of: datetime, out: KrRunOutput) -> str:
    """리포트 — 1차 판정표가 먼저, 탐색은 뒤. 선별 없이 전부 싣는다."""
    lines = [
        f"# 규칙 항목별 IC — 국내 주식 {key} ({as_of.date().isoformat()})",
        "",
        f"- 사전등록: `salt-forecast/preregistration/2026-11-10-rule-ic-kr.toml` · 규칙 `{RULE_VERSION}`"
        f" · 실행 커밋 `{git_sha}`",
        f"- 창: {out.window[0]} ~ {out.window[1]} · 거래일 {out.sessions}"
        f" · 날짜당 평균 대상 종목 {out.universe_mean:.0f}",
        "- 표본 선택: 지금 서버가 모으는 국내 종목(폐지 종목 없음 — **생존 편향**)"
        " · 대상은 kr-universe@1 을 날마다 as-of 로",
        "- IC = 거래일별 종목 간 스피어만의 평균. CI = 거래일 이동 블록 부트스트랩 95%."
        " 지평 = 거래일(단타 1 · 장기 21 ≈ 30일)",
        "- 단타 rsi_d1 은 라이브(1시간봉) 대리 — 탐색. 심리 · 대형 체결은 국내 판단 재료가 아니라 없다",
        "",
        "## 1차 검정 (판정)",
        "",
        "| 항목 | 모드 | 지평(거래일) | 날짜 | IC | 95% CI | 판정 |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in (x for x in out.results["all"] if x.primary):
        lines.append(
            f"| {r.item} | {r.mode} | {r.horizon_days} | {r.n_dates} | {_fmt(r.ic_mean)} |"
            f" [{_fmt(r.ci_low)}, {_fmt(r.ci_high)}] | **{_VERDICT_KO[r.verdict]}** |"
        )
    lines += [
        "",
        "판정은 보고까지다(등록 [decision].apply) — 국내 규칙을 바꾸면 새 규칙 버전이고 국내 표본은 새로 쌓인다.",
        "",
        "## 삼중 장벽 클래스 비율 (+1 / 0 / −1)",
        "",
    ]
    for h, (u, z, dn) in out.barrier_ratio.items():
        flag = "" if all(0.2 <= v <= 0.6 for v in (u, z, dn)) else " — 20~60% 밖(장벽 재설정 검토)"
        lines.append(f"- {h} 거래일: {_fmt(u, True)} / {_fmt(z, True)} / {_fmt(dn, True)}{flag}")
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

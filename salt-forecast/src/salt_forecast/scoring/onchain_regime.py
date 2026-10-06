"""온체인 과열 상한 채점 — 사전등록 onchain-regime@1 을 그대로 실행한다(FC-REQ-015).

판정이 있다: mvrv_cap 이 [decision] pass 넷을 모두 넘으면 목표 비중에 과열 상한을 넣는다. 넷은 `Verdict` 의 네 칸이다.
기준은 target-weight@2 core 규칙(σ 0.15 · 상한 0.6 · 주간 · 편도 0.05%) — `scoring.target_weight` 와 같은 함수로 돈다.
탐색 표(분위 80% · 순유입 z · 방향 IC)는 리포트에만 쓰고 판정에 쓰지 않는다.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, date, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain import onchain as oc
from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.domain.ic import block_bootstrap_spearman
from salt_forecast.domain.labels import ewma_sigma
from salt_forecast.domain.panel import Panel, align_points, build_panel, forward_log_return
from salt_forecast.domain.regime import capture, month_keys
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.domain.target_weight import CAP, block_indices, cagr, calmar, max_drawdown, paired_ci, simulate
from salt_forecast.scoring.target_weight import BTC, CORE, monday_rows, simple_returns, target_matrix

SEED = 20261006
TARGET = 0.15
START = datetime(2018, 1, 1, tzinfo=UTC)
THRESHOLD_SINCE = int(datetime(2011, 1, 1, tzinfo=UTC).timestamp())
MIN_CAPPED_WEEKS = 20
MIN_EPISODES = 2
MVRV = "cm:btc:CapMVRVCur"
FLOW_IN = "cm:btc:FlowInExNtv"
FLOW_OUT = "cm:btc:FlowOutExNtv"
ACTIVE = "cm:btc:AdrActCnt"
HASH = "cm:btc:HashRate"
MAX_SIGNAL_AGE = 7 * DAY  # 등록: 마지막 관측이 t − 7일보다 오래됐으면 값 없음
MAX_FLOW_AGE = 3 * DAY  # 탐색 — 일 격자가 같은 관측을 두 번 세지 않게

type Vec = NDArray[np.float64]


@dataclass(frozen=True, slots=True)
class Leg:
    name: str
    cagr: float
    mdd: float
    calmar: float
    upside: float
    downside: float
    exposure: float


@dataclass(frozen=True, slots=True)
class Candidate:
    name: str
    leg: Leg
    delta_mdd: tuple[float, float, float]  # (점추정, 2.5%, 97.5%) — 양수 = 덜 빠졌다
    delta_calmar: tuple[float, float, float]
    halves: tuple[float, float]  # 앞 · 뒤 절반 delta_calmar 점추정
    capped_weeks: int
    weeks: int
    episodes: int
    capped_now: bool

    @property
    def checks(self) -> tuple[bool, bool, bool, bool]:
        return (
            self.delta_mdd[1] > 0,
            self.delta_calmar[0] >= 0,
            self.halves[0] >= 0 and self.halves[1] >= 0,
            self.capped_weeks >= MIN_CAPPED_WEEKS and self.episodes >= MIN_EPISODES,
        )

    @property
    def passed(self) -> bool:
        return all(self.checks)


@dataclass(frozen=True, slots=True)
class Direction:
    signal: str
    horizon: int
    ic: float
    lo: float
    hi: float
    n: int


@dataclass(slots=True)
class RunOutput:
    window: tuple[date, date]
    base: Leg
    hold_btc: Leg
    primary: Candidate
    exploratory: list[Candidate] = field(default_factory=list[Candidate])
    direction: list[Direction] = field(default_factory=list[Direction])
    capped_spans: list[tuple[date, date]] = field(default_factory=list[tuple[date, date]])
    mvrv_now: float = float("nan")
    threshold_now: float = float("nan")

    @property
    def adopted(self) -> bool:
        return self.primary.passed


def _day(epoch: int) -> date:
    return datetime.fromtimestamp(epoch, UTC).date()


def _asof(s: VintagedSeries, dates: NDArray[np.int64], max_obs_age: int) -> Vec:
    """t 마다 available ≤ t 인 가장 최근 관측값. 그 관측일이 t − max_obs_age 보다 오래됐으면 NaN."""
    val = align_points(s.available, s.value, dates, 10**12)
    obs = align_points(s.available, s.observed.astype(np.float64), dates, 10**12)
    return np.where(np.isfinite(obs) & (dates - obs <= max_obs_age), val, np.nan)


def _series(cm: Mapping[str, VintagedSeries], sid: str) -> VintagedSeries:
    if sid not in cm:
        raise ValueError(f"{sid} 가 없다 — ingest_market --only coinmetrics 먼저")
    return cm[sid]


def _leg(name: str, log_r: Vec, btc_log: Vec, expo: Vec, months: NDArray[np.int64]) -> Leg:
    up, dn = capture(btc_log, log_r, months)
    return Leg(name, cagr(log_r), max_drawdown(log_r), calmar(log_r), up, dn, float(expo.mean()))


def run(ohlcv: Mapping[str, OhlcvSeries], cm: Mapping[str, VintagedSeries], as_of: datetime) -> RunOutput:
    for s in CORE:
        if s not in ohlcv or ohlcv[s].available_at.size == 0:
            raise ValueError(f"{s} 일봉이 없다")
    end = int(as_of.timestamp())
    first = min(int(ohlcv[s].available_at[0]) for s in CORE)
    panel = build_panel({s: ohlcv[s] for s in CORE}, first, end)
    dates = panel.dates
    n = dates.size
    sigma = ewma_sigma(panel) * np.sqrt(365.0)
    simple = simple_returns(panel)
    core_idx = [panel.column(s) for s in CORE]
    last = int(np.searchsorted(dates, end - DAY, side="right")) - 1
    in_period = (dates > int(START.timestamp())) & (np.arange(n) <= last)
    ready = in_period & np.isfinite(sigma[:, core_idx]).all(axis=1)
    mondays = monday_rows(dates) & ready
    if not mondays.any():
        raise ValueError("평가 창 안에 리밸런스 날이 없다")
    first_reb = int(np.argmax(mondays))
    rows = np.flatnonzero(in_period & (np.arange(n) > first_reb))
    months = month_keys(dates)[rows]
    btc_log = np.log1p(simple[:, panel.column(BTC)])[rows]
    idx = block_indices(rows.size, seed=SEED)
    mid = rows.size // 2

    base_tm = target_matrix(panel, sigma, mondays, TARGET, "core", CAP)
    base_sim = simulate(simple, base_tm, mondays)
    base_log = base_sim.log_r[rows]
    base = _leg("base", base_log, btc_log, base_sim.exposure[rows], months)
    hold = _leg("BTC 보유", btc_log, btc_log, np.ones(rows.size), months)

    # 신호 — 전부 t 에 알던 값만
    mv = _series(cm, MVRV)
    mvrv = _asof(mv, dates, MAX_SIGNAL_AGE)
    thr90 = oc.expanding_quantile(mv.observed, mv.available, mv.value, dates, 0.90, THRESHOLD_SINCE)
    thr80 = oc.expanding_quantile(mv.observed, mv.available, mv.value, dates, 0.80, THRESHOLD_SINCE)
    net = _asof(_series(cm, FLOW_IN), dates, MAX_FLOW_AGE) - _asof(_series(cm, FLOW_OUT), dates, MAX_FLOW_AGE)
    flow_z = oc.trailing_z(oc.trailing_sum(net))

    reb_rows = np.flatnonzero(mondays)

    def candidate(name: str, mult: Vec) -> Candidate:
        tm = base_tm * mult[:, None]
        sim = simulate(simple, tm, mondays)
        c_log = sim.log_r[rows]
        flags = mult[reb_rows] < 1.0
        return Candidate(
            name=name,
            leg=_leg(name, c_log, btc_log, sim.exposure[rows], months),
            delta_mdd=paired_ci(lambda c: max_drawdown(c[0]) - max_drawdown(c[1]), [base_log, c_log], idx),
            delta_calmar=paired_ci(lambda c: calmar(c[1]) - calmar(c[0]), [base_log, c_log], idx),
            halves=(
                calmar(c_log[:mid]) - calmar(base_log[:mid]),
                calmar(c_log[mid:]) - calmar(base_log[mid:]),
            ),
            capped_weeks=int(flags.sum()),
            weeks=int(reb_rows.size),
            episodes=oc.episodes(flags),
            capped_now=bool(flags[-1]) if flags.size else False,
        )

    m90 = oc.cap_multiplier(mvrv, thr90)
    out = RunOutput(
        window=(_day(int(dates[rows[0]])), _day(int(dates[rows[-1]]))),
        base=base,
        hold_btc=hold,
        primary=candidate("mvrv_cap", m90),
    )
    out.exploratory.append(candidate("mvrv_cap_80", oc.cap_multiplier(mvrv, thr80)))
    out.exploratory.append(candidate("netflow_cap", oc.cap_multiplier(flow_z, np.full(n, 2.0))))

    # 상한이 걸린 리밸런스 주의 구간(리포트 — 실패 사례를 숨기지 않는다)
    flags = m90[reb_rows] < 1.0
    start: int | None = None
    for k, on in enumerate([*flags.tolist(), False]):
        if on and start is None:
            start = k
        if not on and start is not None:
            out.capped_spans.append((_day(int(dates[reb_rows[start]])), _day(int(dates[reb_rows[k - 1]]))))
            start = None
    fin = np.flatnonzero(np.isfinite(mvrv) & np.isfinite(thr90) & (np.arange(n) <= last))
    if fin.size:
        out.mvrv_now, out.threshold_now = float(mvrv[fin[-1]]), float(thr90[fin[-1]])

    # 탐색 — 방향(MVRV 수준 기대 음, 나머지 0)
    j = panel.column(BTC)
    sub = Panel(dates, (BTC,), panel.high[:, [j]], panel.low[:, [j]], panel.close[:, [j]], panel.volume[:, [j]],
                panel.listed_at[[j]])  # fmt: skip
    active = _asof(_series(cm, ACTIVE), dates, MAX_FLOW_AGE)
    hashrate = _asof(_series(cm, HASH), dates, MAX_FLOW_AGE)
    signals = {
        "mvrv_level": mvrv,
        "mvrv_change_30d": np.concatenate((np.full(30, np.nan), mvrv[30:] - mvrv[:-30])),
        "netflow_z": flow_z,
        "active_growth_30d": _ratio(_mean(active, 30), _shift(_mean(active, 30), 30)) - 1.0,
        "hash_ribbon": _ratio(_mean(hashrate, 30), _mean(hashrate, 60)) - 1.0,
    }
    in_window = np.zeros(n, dtype=bool)
    in_window[rows] = True
    for h in (30, 90):
        fwd = forward_log_return(sub, h)[:, 0]
        for sname, sig in signals.items():
            x = np.where(in_window, sig, np.nan)
            ic, lo, hi, cnt = block_bootstrap_spearman(x, fwd, max(7, 2 * h), seed=SEED)
            out.direction.append(Direction(sname, h, ic, lo, hi, cnt))
    return out


def _mean(x: Vec, w: int) -> Vec:
    out = oc.trailing_sum(x, w)
    return out / w


def _shift(x: Vec, k: int) -> Vec:
    return np.concatenate((np.full(k, np.nan), x[:-k]))


def _ratio(a: Vec, b: Vec) -> Vec:
    with np.errstate(divide="ignore", invalid="ignore"):
        return np.where(np.isfinite(a) & np.isfinite(b) & (b > 0), a / b, np.nan)


# ── 리포트 ─────────────────────────────────────────────────────────────────


def _pct(x: float) -> str:
    return "—" if x != x else f"{x * 100:+.1f}%"


def _num(x: float, digits: int = 2) -> str:
    return "—" if x != x else f"{x:+.{digits}f}"


def _ok(b: bool) -> str:
    return "✓" if b else "✗"


def _legrow(leg: Leg) -> str:
    return (
        f"| {leg.name} | {_pct(leg.cagr)} | {_pct(-leg.mdd)} | {_num(leg.calmar)} | {_num(leg.upside)} | "
        f"{_num(leg.downside)} | {_num(leg.exposure)} |"
    )


def render_report(key: str, sha: str, as_of: datetime, out: RunOutput) -> str:
    p = out.primary
    c1, c2, c3, c4 = p.checks
    lines = [
        f"# 온체인 과열 상한 채점 — `{key}` ({as_of.date().isoformat()})",
        "",
        f"- 사전등록: `salt-forecast/preregistration/2026-10-06-onchain-regime.toml` · 실행 코드 `{sha}`",
        f"- 기간: {out.window[0]} ~ {out.window[1]} · 업비트 원화 일봉 KRW-BTC · KRW-ETH · Coin Metrics Community BTC",
        "- 기준: target-weight@2 core(목표 σ 0.15 · 한 종목 상한 0.6 · 매주 월요일 · 편도 0.05%)",
        "- 후보 mvrv_cap: t 에 알던 BTC MVRV ≥ 확장 창 90% 분위(2011-01-01~, 1000일 이상)면 core 비중 × 0.5",
        "- CI: 일 수익 쌍 이동 블록 부트스트랩(블록 30일 · 2000회 · seed 20261006) [2.5%, 97.5%]",
        "- **같은 8년 표본을 target-weight@1 · @2 · regime-gate@1 · dvol-sigma@1 이 이미 썼다** — "
        "이 등록은 새 원천 하나 · 후보 하나",
        "",
        f"## 판정 — **{'채택: mvrv_cap' if out.adopted else '채택 없음'}**",
        "",
        "| 조건 | 값 | 통과 |",
        "|---|---|---|",
        f"| (1) ΔMDD 95% CI 하한 > 0 | {_pct(p.delta_mdd[0])} [{_pct(p.delta_mdd[1])}, {_pct(p.delta_mdd[2])}] "
        f"| {_ok(c1)} |",
        f"| (2) ΔCalmar 점추정 ≥ 0 | {_num(p.delta_calmar[0])} [{_num(p.delta_calmar[1])}, {_num(p.delta_calmar[2])}] "
        f"| {_ok(c2)} |",
        f"| (3) 앞 · 뒤 절반 ΔCalmar ≥ 0 | {_num(p.halves[0])} · {_num(p.halves[1])} | {_ok(c3)} |",
        f"| (4) 상한 주 ≥ {MIN_CAPPED_WEEKS} · 구간 ≥ {MIN_EPISODES} | {p.capped_weeks}주 / {p.weeks}주 · "
        f"{p.episodes}구간 | {_ok(c4)} |",
        "",
        "## 곡선",
        "",
        "| 곡선 | CAGR | MDD | Calmar | 상승 포착 | 하락 포착 | 평균 노출 |",
        "|---|---|---|---|---|---|---|",
        _legrow(out.hold_btc),
        _legrow(out.base),
        _legrow(p.leg),
        "",
        "## 상한이 걸린 때",
        "",
    ]
    if out.capped_spans:
        lines += ["| 시작 주 | 끝 주 |", "|---|---|"]
        lines += [f"| {a} | {b} |" for a, b in out.capped_spans]
    else:
        lines.append("없음 — 창 안에서 한 번도 걸리지 않았다")
    lines += [
        "",
        f"- 지금: MVRV {_num(out.mvrv_now)} · 90% 분위 {_num(out.threshold_now)} · "
        f"상한 {'걸림' if p.capped_now else '없음'}",
        "",
        "## 탐색 (판정에 쓰지 않는다)",
        "",
        "### 같은 4조건 — 다른 후보",
        "",
        "| 후보 | ΔMDD [CI] | ΔCalmar | 절반 | 상한 주 · 구간 | 4조건 |",
        "|---|---|---|---|---|---|",
    ]
    for c in out.exploratory:
        lines.append(
            f"| {c.name} | {_pct(c.delta_mdd[0])} [{_pct(c.delta_mdd[1])}, {_pct(c.delta_mdd[2])}] | "
            f"{_num(c.delta_calmar[0])} | {_num(c.halves[0])} · {_num(c.halves[1])} | "
            f"{c.capped_weeks}주 · {c.episodes}구간 | {''.join(_ok(x) for x in c.checks)} |"
        )
    lines += [
        "",
        "netflow_cap 의 거래소 입출금은 원천이 주소 라벨을 소급 적용한 값이다 — "
        "좋게 나와도 미래 지식이 섞였을 수 있다.",
        "",
        "### 방향 — 시계열 스피어만 vs 앞으로 BTC 로그수익(블록 = max(7, 2h))",
        "",
        "| 신호 | 지평 | IC [95% CI] | n |",
        "|---|---|---|---|",
    ]
    for d in out.direction:
        lines.append(f"| {d.signal} | {d.horizon}일 | {_num(d.ic, 3)} [{_num(d.lo, 3)}, {_num(d.hi, 3)}] | {d.n} |")
    lines += [
        "",
        "겹치는 창(30 · 90일)이라 n 은 독립 표본 수가 아니다. 블록이 자기상관을 일부만 흡수한다.",
        "",
        "## 알아둘 것",
        "",
        "- 사이클 고점은 이 창에 2~3번뿐이다(리서치 n≈4). 조건 (4)가 그 한계를 판정에 넣는다",
        "- 업비트 원화 가격 · 달러 기준 MVRV — 김치 프리미엄이 섞인다",
        "- 탐색 eth_mvrv(ETH 자기 MVRV)는 돌리지 않았다 — ETH 온체인을 수집하지 않았다(BTC 만)",
        "- 생존 편향: core 는 BTC · ETH 둘뿐이라 해당 없음",
        "- 재현: `uv run python -m salt_forecast.jobs.onchain_regime --as-of " + as_of.date().isoformat() + "`",
        "",
    ]
    return "\n".join(lines)

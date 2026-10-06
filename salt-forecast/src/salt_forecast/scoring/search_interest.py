"""검색 관심 채점 — 사전등록 search-interest@1 을 그대로 실행한다(FC-REQ-017).

판정만 한다. 규칙 · 화면은 바꾸지 않는다(등록 [decision] — 쓰려면 새 등록). 탐색 표는 리포트에만.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, date, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.ic import spearman
from salt_forecast.domain.panel import Panel, age_days, build_panel, forward_log_return
from salt_forecast.domain.search_interest import last_known_day, series_id, spike
from salt_forecast.domain.series import OhlcvSeries
from salt_forecast.scoring.target_weight import BTC, alt_universe, monday_rows

type Vec = NDArray[np.float64]

SEED = 20261006
N_BOOT = 2000
BLOCK = 4
Q = 0.10
MIN_WEEKS = 104
MIN_ALTS = 5
START = datetime(2016, 3, 7, tzinfo=UTC)
ETH = "KRW-ETH"


def _block_draws(n: int, rng: np.random.Generator) -> NDArray[np.intp]:
    b = max(1, min(BLOCK, n))
    k = int(np.ceil(n / b))
    starts = rng.integers(0, n - b + 1, size=(N_BOOT, k))
    return (starts[:, :, None] + np.arange(b)[None, None, :]).reshape(N_BOOT, -1)[:, :n]


@dataclass(frozen=True, slots=True)
class Test:
    name: str
    n: int
    estimate: float
    ci_low: float
    ci_high: float
    p: float  # H1 양측 · H2 단측(음)
    mean_obs: float = 1.0


def ts_test(name: str, x: Vec, y: Vec, seed: int = SEED) -> Test:
    """시계열 스피어만 + 쌍 블록 부트스트랩. p 는 양측(부트스트랩 분포가 0 을 넘는 쪽의 두 배)."""
    ok = ~np.isnan(x) & ~np.isnan(y)
    xv, yv = x[ok], y[ok]
    n = int(xv.size)
    est = spearman(xv, yv)
    if n < 3:
        return Test(name, n, est, float("nan"), float("nan"), float("nan"))
    idx = _block_draws(n, np.random.default_rng(seed))
    boots = np.array([spearman(xv[i], yv[i]) for i in idx])
    lo, hi = np.nanquantile(boots, [0.025, 0.975])
    p = float(min(1.0, 2 * min(np.nanmean(boots <= 0), np.nanmean(boots >= 0))))
    return Test(name, n, est, float(lo), float(hi), p)


def mean_test(name: str, weekly_ic: Vec, obs: Vec, seed: int = SEED) -> Test:
    """주별 IC 평균 + 블록 부트스트랩. p 는 단측(기대 음) = 부트스트랩 평균이 0 이상인 비율."""
    ok = ~np.isnan(weekly_ic)
    v = weekly_ic[ok]
    n = int(v.size)
    if n < 3:
        return Test(name, n, float(np.nanmean(v)) if n else float("nan"), float("nan"), float("nan"), float("nan"))
    idx = _block_draws(n, np.random.default_rng(seed))
    means = v[idx].mean(axis=1)
    lo, hi = np.quantile(means, [0.025, 0.975])
    return Test(name, n, float(v.mean()), float(lo), float(hi), float(np.mean(means >= 0)), float(obs[ok].mean()))


def by_reject(ps: list[float], q: float = Q) -> list[bool]:
    """Benjamini–Yekutieli. 의존 구조 가정 없이 FDR q."""
    m = len(ps)
    c = sum(1.0 / i for i in range(1, m + 1))
    order = sorted(range(m), key=lambda i: ps[i])
    k_max = 0
    for rank, i in enumerate(order, start=1):
        if not np.isnan(ps[i]) and ps[i] <= q * rank / (m * c):
            k_max = rank
    out = [False] * m
    for rank, i in enumerate(order, start=1):
        out[i] = rank <= k_max
    return out


@dataclass(frozen=True, slots=True)
class RunOutput:
    h1: Test
    h2: Test
    h1_pass: bool
    h2_pass: bool
    weeks: int
    window: tuple[date, date]
    keywords: int
    exploratory: list[Test]


def _signal_matrix(panel: Panel, rows: NDArray[np.intp], search: Mapping[str, Mapping[date, float]]) -> Vec:
    out = np.full((rows.size, len(panel.symbols)), np.nan)
    for r, t in enumerate(rows):
        day = last_known_day(datetime.fromtimestamp(int(panel.dates[t]), UTC))
        for j, sym in enumerate(panel.symbols):
            s = search.get(series_id(sym))
            if s:
                v = spike(s, day)
                out[r, j] = np.nan if v is None else v
    return out


def run(
    ohlcv: Mapping[str, OhlcvSeries],
    search: Mapping[str, Mapping[date, float]],
    as_of: datetime,
    start: datetime = START,
) -> RunOutput:
    panel = build_panel(ohlcv, int(start.timestamp()), int(as_of.timestamp()))
    fwd7 = forward_log_return(panel, 7)
    fwd14 = forward_log_return(panel, 14)
    rows = np.flatnonzero(monday_rows(panel.dates) & ~np.isnan(fwd7[:, panel.column(BTC)]))
    sig = _signal_matrix(panel, rows, search)
    b = panel.column(BTC)
    h1 = ts_test("H1 BTC 검색 급증 → 7일", sig[:, b], fwd7[rows, b])

    age = age_days(panel)
    ics = np.full(rows.size, np.nan)
    obs = np.zeros(rows.size)
    for r, t in enumerate(rows):
        cols = alt_universe(panel, int(t), age)
        s = sig[r, cols]
        y = fwd7[t, cols] - fwd7[t, b]
        ok = ~np.isnan(s) & ~np.isnan(y)
        obs[r] = ok.sum()
        if ok.sum() >= MIN_ALTS:
            ics[r] = spearman(s[ok], y[ok])
    h2 = mean_test("H2 알트 검색 급증 → 7일 BTC 대비(반전)", ics, obs)
    rej = by_reject([h1.p, h2.p])
    h1_pass = rej[0] and h1.n >= MIN_WEEKS
    h2_pass = rej[1] and h2.n >= MIN_WEEKS and h2.estimate < 0

    explore: list[Test] = []
    biweekly = rows[::2]
    sig14 = sig[::2]
    explore.append(ts_test("탐색 BTC → 14일(2주 격자)", sig14[:, b], fwd14[biweekly, b]))
    if ETH in panel.symbols:
        e = panel.column(ETH)
        explore.append(ts_test("탐색 ETH → 7일", sig[:, e], fwd7[rows, e]))
    recent = panel.dates[rows] >= int(datetime(2021, 1, 1, tzinfo=UTC).timestamp())
    explore.append(ts_test("탐색 BTC 2021 뒤", sig[recent, b], fwd7[rows[recent], b]))
    explore.append(mean_test("탐색 알트 반전 2021 뒤", np.where(recent, ics, np.nan), obs))

    first = datetime.fromtimestamp(int(panel.dates[rows[0]]), UTC).date() if rows.size else start.date()
    last = datetime.fromtimestamp(int(panel.dates[rows[-1]]), UTC).date() if rows.size else start.date()
    return RunOutput(h1, h2, h1_pass, h2_pass, int(rows.size), (first, last), len(search), explore)


def _f(x: float, d: int = 3) -> str:
    return "—" if np.isnan(x) else f"{x:+.{d}f}"


def render_report(key: str, sha: str, as_of: datetime, out: RunOutput) -> str:
    def row(t: Test) -> str:
        return (
            f"| {t.name} | {t.n} | {t.mean_obs:.1f} | {_f(t.estimate)} | [{_f(t.ci_low)}, {_f(t.ci_high)}] | "
            f"{'—' if np.isnan(t.p) else f'{t.p:.3f}'} |"
        )

    verdict = {
        True: "근거 있음",
        False: "근거 없음",
    }
    lines = [
        f"# 검색 관심 — {key} 결과 ({as_of.date().isoformat()})",
        "",
        f"- 사전등록: `salt-forecast/preregistration/2026-10-06-search-interest.toml` · 실행 코드 `{sha}`",
        f"- 표본: 월요일 격자 {out.weeks}주 ({out.window[0]} ~ {out.window[1]}) · 검색어 {out.keywords}개",
        "- 표본 선택: 지금 상장된 업비트 원화 종목만(상장폐지 미수집 — 사용자 결정 2026-09-29).",
        "  생존 편향은 H2 를 좋게 만든다",
        f"- 다중 비교: H1 · H2 BY-FDR q = {Q}. 최소 {MIN_WEEKS}주",
        "",
        "## 판정",
        "",
        "| 검정 | 주 | 주당 종목 | 추정 | 95% CI(보정 전) | p |",
        "|---|---|---|---|---|---|",
        row(out.h1),
        row(out.h2),
        "",
        f"- H1(양측): **{verdict[out.h1_pass]}**",
        f"- H2(단측 음): **{verdict[out.h2_pass]}**",
        "- 규칙 · 화면은 이 결과로 바꾸지 않는다.",
        "  쓰려면 새 등록(mode-decision@3 · target-weight@3)을 결과 전에 만든다.",
        "- 둘 다 근거 없음이면 증분 수집을 끄고 백필만 남긴다(등록 [decision]).",
        "",
        "## 탐색 (판정에 쓰지 않는다)",
        "",
        "| 검정 | 주 | 주당 종목 | 추정 | 95% CI | p |",
        "|---|---|---|---|---|---|",
        *[row(t) for t in out.exploratory],
        "",
        "- 알트 시가총액 상위 5 탐색은 생략 — 시가총액 이력 원천이 없다.",
        "",
    ]
    return "\n".join(lines)

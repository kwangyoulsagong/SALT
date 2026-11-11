"""단타 방향 확률 시험 · 라이브 예측 — 사전등록 short-direction@2 를 그대로 실행한다(FC-REQ-028 FR-1 · FR-4).

시험은 매일(전 이력 walk-forward — 칸마다 마지막 블록 적합을 같이 남긴다),
라이브 예측은 매시 그 적합으로 마지막 격자 행만.
라이브 예측은 **통과한 칸만** 쓴다(불변식 1). 시험 안 한 칸(국내 1h
· 4h)은 `not_tested` 행으로 남겨 화면 사유가 한 곳에서 나온다.
"""

from __future__ import annotations

import math
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.base_rate import CRYPTO_ROUND_TRIP
from salt_forecast.domain.panel import build_panel, forward_log_return, rolling_sum
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.domain.short_direction import (
    CRYPTO_SPECS,
    HOUR,
    KR_SPEC,
    CellPanel,
    CellResult,
    Fit,
    Rows,
    WalkResult,
    cell_rows,
    crypto_cell_panel,
    decide,
    evaluate,
    featureless,
    kr_cell_panel,
    live_quantiles,
    narrow_to_universe,
    shift_labels,
    walk_forward,
)
from salt_forecast.scoring.base_rate import kr_costs
from salt_forecast.scoring.rule_ic_kr import (
    KR_CLOSE_UTC_OFFSET,
    kr_universe,
    label_without_breaks,
    session_panel,
    up_breaks,
)

CRYPTO_START = "2024-11-01T00:00:00Z"
KR_START = "2021-01-01T00:00:00Z"
NOT_TESTED = (("kr", "1h"), ("kr", "4h"))
LIVE_HOURS = 24 * 32  # 라이브 예측에 읽는 1시간봉 — 유니버스 720 + 여유
KR_LIVE_SESSIONS = 300  # 라이브 국내 — 끊김 · σ · 유니버스(250봉) 창


@dataclass(slots=True)
class Cell:
    result: CellResult
    fit: Fit | None = None


@dataclass(frozen=True, slots=True)
class LivePrediction:
    symbol: str
    market: str
    horizon: str
    as_of: datetime
    p_up: float
    q10: float
    q50: float
    q90: float
    ref_price: float
    invalidation: float


@dataclass(slots=True)
class TestRun:
    cells: list[Cell] = field(default_factory=lambda: [])
    symbols: dict[str, tuple[str, ...]] = field(
        default_factory=lambda: {}
    )  # market → 패널 종목(misses 의 sym 번호 풀이)


def _ts(s: str) -> int:
    return int(datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp())


def crypto_panel(ohlcv: Mapping[str, OhlcvSeries], start: int, as_of: datetime) -> CellPanel:
    t_end = int(as_of.timestamp())
    p = build_panel({s: o.as_of(t_end) for s, o in ohlcv.items()}, start, t_end, step=HOUR)
    narrow, universe = narrow_to_universe(p)
    del p
    return crypto_cell_panel(narrow, universe=universe)


def kr_panel(ohlcv: Mapping[str, OhlcvSeries], start: int, as_of: datetime) -> tuple[CellPanel, np.ndarray]:
    t_end = int(as_of.timestamp())
    p = session_panel({s: o.as_of(t_end) for s, o in ohlcv.items()}, start, t_end)
    breaks = up_breaks(p)
    recent_break = rolling_sum(breaks.astype(np.float64), 22) > 0
    return kr_cell_panel(p, kr_universe(p, breaks) & ~recent_break), breaks


def _cell(market: str, horizon: str, rows: Rows, n_grid: int, spec_key: str) -> tuple[CellResult, WalkResult]:
    spec = CRYPTO_SPECS[spec_key] if market == "crypto" else KR_SPEC
    wf = walk_forward(rows, spec, n_grid)
    res = evaluate(market, horizon, rows, wf, spec, walk_forward(featureless(rows), spec, n_grid))
    # 플라시보(@2) — 라벨을 종목마다 8~30일 미뤄 피처 몫이 사라지나(같은 기준: 피처 없는 모델 · 같은 플라시보 라벨)
    placebo = shift_labels(rows, 24 if market == "crypto" else 1)
    pl = evaluate(
        market, horizon, placebo, walk_forward(placebo, spec, n_grid), spec,
        walk_forward(featureless(placebo), spec, n_grid),
    )  # fmt: skip
    res.placebo_lo, res.placebo_hi = pl.bss_lo, pl.bss_hi
    return res, wf


def run_test(
    crypto_1h: Mapping[str, OhlcvSeries] | None, kr_1d: Mapping[str, OhlcvSeries] | None, as_of: datetime
) -> TestRun:
    run = TestRun()
    tested: list[Cell] = []
    if crypto_1h is not None:
        cp = crypto_panel(crypto_1h, _ts(CRYPTO_START), as_of)
        run.symbols["crypto"] = cp.panel.symbols
        day = ((cp.panel.dates - 1) // DAY).astype(np.int64)
        for horizon, h in (("1h", 1), ("4h", 4), ("1d", 24)):
            rows = cell_rows(cp, h, forward_log_return(cp.panel, h), CRYPTO_ROUND_TRIP, day)
            res, wf = _cell("crypto", horizon, rows, cp.panel.dates.size - 1, horizon)
            tested.append(Cell(res, wf.last_fit))
    if kr_1d is not None:
        cp, breaks = kr_panel(kr_1d, _ts(KR_START), as_of)
        run.symbols["kr"] = cp.panel.symbols
        day = (cp.panel.dates // DAY).astype(np.int64)
        label = label_without_breaks(forward_log_return(cp.panel, 1), breaks, 1)
        rows = cell_rows(cp, 1, label, kr_costs(cp.panel, 1), day)
        res, wf = _cell("kr", "1d", rows, cp.panel.dates.size - 1, "1d")
        tested.append(Cell(res, wf.last_fit))
    decide([c.result for c in tested])
    run.cells = tested
    if kr_1d is not None:
        for market, horizon in NOT_TESTED:
            run.cells.append(Cell(CellResult(market, horizon, status="not_tested", reason="insufficient_history")))
    return run


def live_predictions(
    cp: CellPanel, market: str, horizon: str, h: int, fit: Fit, zq: Mapping[str, tuple[float, float, float]]
) -> list[LivePrediction]:
    """마지막 격자 행만 — 그 행이 유니버스 안이고 피처가 다 있는 종목. 분위가 없는 p 구간이면 그 종목은 쓰지 않는다."""
    last = cp.panel.dates.size - 1
    day = (cp.panel.dates // DAY).astype(np.int64)
    rows = cell_rows(cp, h, np.full_like(cp.panel.close, np.nan), 0.0, day)
    sel = np.flatnonzero(rows.t == last)
    out: list[LivePrediction] = []
    if sel.size == 0:
        return out
    p = fit.predict(rows.x[sel])
    when = datetime.fromtimestamp(int(cp.panel.dates[last]), tz=UTC)
    if market == "kr":
        when = datetime.fromtimestamp(
            int(cp.panel.dates[last]) + KR_CLOSE_UTC_OFFSET, tz=UTC
        )  # 거래일 격자 00:00 → 16:00 KST
    for k, i in enumerate(sel):
        q = live_quantiles(dict(zq), float(p[k]), float(rows.sigma_h[i]))
        if q is None:
            continue
        sym = cp.panel.symbols[int(rows.sym[i])]
        price = float(cp.panel.close[last, int(rows.sym[i])])
        out.append(
            LivePrediction(sym, market, horizon, when, float(p[k]), q[0], q[1], q[2], price, price * math.exp(q[0]))
        )
    return out


def _pct(x: float, digits: int = 1) -> str:
    return "—" if not math.isfinite(x) else f"{x * 100:.{digits}f}%"


def _num(x: float, digits: int = 4) -> str:
    return "—" if not math.isfinite(x) else f"{x:+.{digits}f}"


def render_report(key: str, git_sha: str, as_of: datetime, run: TestRun) -> str:
    lines = [
        f"# 단타 방향 확률 시험 — `{key}` ({as_of.date().isoformat()})",
        "",
        f"- 사전등록 `preregistration/2026-11-11-short-direction-2.toml` · 코드 `{git_sha}`"
        f" · as_of {as_of.isoformat()}",
        "- 모델: logit p = logit(기후값 b) + w·x(피처 7 · L2 1.0) · Beta 보정(직전 60일 OOS ≥ 2,000행) · 칸마다 변형 1",
        "- 기준(@2): **피처 없는 같은 모델**(같은 오프셋 · 같은 Beta 보정 — '요즘 분위기'까지 아는 기준)"
        " — BSS = 피처가 더한 몫 ·"
        " 직전 방향(sign(r_h) 하나). 기후값 대비 BSS 는 참고 열(@1 과 이어 보기)",
        "- 플라시보(@2): 종목마다 라벨을 8~30일 통째로 미뤄 같은 기준으로 잰 피처 몫 CI 가 0 을 포함해야 한다",
        "- **표본 재사용**: @1 · 진단에서 같은 기간을 봤다 — 통과 = 라이브 원장 발행 허가뿐,"
        " 화면 확률은 등록 뒤 라이브 확신 300 · 하한 > 0",
        "- 표본 선택: 코인 = 매일 직전 720시간 거래대금 상위 50"
        "(지금 상장된 원화 마켓만 — 폐지 종목 1시간봉은 원천에 없다, 생존 편향) ·"
        " 국내 = kr-universe@1 + 끊김 제외 중 20일 거래대금 상위 200(시점 고정)",
        "- 평가 행 = 겹치는 라벨의 모든 격자 행 → CI 는 날짜 이동 블록 부트스트랩(코인 7일 · 국내 10거래일, 2,000회)",
        "",
        "## 판정",
        "",
        "| 칸 | 상태 | 사유 | 평가 행 | 기간 | BSS(피처 몫) | 95% | Holm p | BSS(기후값, 참고) | BSS(직전 방향) | ECE"
        " | 확신 행 | 확신 적중 | 늘 오른다 | 차 95% | 비용 뒤 오름 평균 | 95% | 플라시보 피처 몫 95% |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for c in run.cells:
        r = c.result
        if r.status == "not_tested":
            lines.append(f"| {r.market}:{r.horizon} | 시험 안 함 | {r.reason} |" + " — |" * 15)
            continue
        win = "—"
        if r.rows:
            a = datetime.fromtimestamp(r.window[0], tz=UTC).date()
            z = datetime.fromtimestamp(r.window[1], tz=UTC).date()
            win = f"{a} ~ {z}"
        hit = r.confident_hits / r.confident if r.confident else float("nan")
        up = r.always_up_hits / r.confident if r.confident else float("nan")
        lines.append(
            f"| {r.market}:{r.horizon} | {r.status} | {r.reason or '—'} | {r.rows:,} | {win} | {_num(r.bss)} | "
            f"{_num(r.bss_lo)} ~ {_num(r.bss_hi)} | {r.bss_p_holm:.3f} | {_num(r.bss_climatology)} | "
            f"{_num(r.bss_persistence)} | {r.ece:.4f} | "
            f"{r.confident:,} | {_pct(hit)} | {_pct(up)} | {_pct(r.hit_diff_lo)} ~ {_pct(r.hit_diff_hi)} | "
            f"{_pct(r.net_mean, 3)} | {_pct(r.net_lo, 3)} ~ {_pct(r.net_hi, 3)} | "
            f"{_num(r.placebo_lo)} ~ {_num(r.placebo_hi)} |"
        )
    lines += ["", "통과 = (1) Holm p ≤ 0.05 · BSS 하한 > 0 · 직전 방향 대비 > 0 (2) ECE ≤ 0.03"
              " (3) 확신 행 ≥ 300 · 차 하한 > 0"
              " (4) 비용 뒤 오름 평균 > 0 (5) 플라시보 피처 몫 CI 가 0 포함.", ""]  # fmt: skip
    lines += ["## 신뢰도 표(10 등빈도 구간 — 말한 확률 · 실제 · 행 수)", ""]
    for c in run.cells:
        r = c.result
        if not r.reliability:
            continue
        lines.append(f"**{r.market}:{r.horizon}** — ECE {r.ece:.4f}(보정 전 {r.ece_raw:.4f})")
        lines.append("")
        lines.append("| 구간 | 말한 평균 | 실제 | 행 |")
        lines.append("|---|---|---|---|")
        for i, (n, pm, ym) in enumerate(r.reliability, 1):
            lines.append(f"| {i} | {_pct(pm)} | {_pct(ym)} | {n:,} |")
        lines.append("")
    lines += ["## 탐색(판정 무관) — 마지막 적합 계수(표준화 피처)", ""]
    for c in run.cells:
        if c.fit is None:
            continue
        r = c.result
        coef = ", ".join(f"{v:+.3f}" for v in c.fit.model.coef)
        lines.append(f"- {r.market}:{r.horizon} b = {c.fit.base:.4f} · w = [{coef}]")
    lines += [
        "",
        "## 한계",
        "",
        "- 코인 1시간봉 이력은 2024-11 부터(약 2년) — 국면 둘 정도. 지금 상장 종목만이라 폐지 종목 손실이 빠진다",
        "- 국내 1시간 · 4시간은 시험하지 않았다(5분봉 2026-10-13 ~ 55종목) — `short-direction@2`(5분봉 거래일 ≥ 120)",
        "- 진입 = 격자 행 종가. 라이브는 그 뒤 몇 분 안의 가격 — 근사",
    ]
    return "\n".join(lines) + "\n"

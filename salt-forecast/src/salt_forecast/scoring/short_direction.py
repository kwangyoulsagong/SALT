"""단타 방향 확률 전진 시험 · 라이브 예측 — 사전등록 short-direction@3 을 그대로 실행한다(FC-REQ-028 FR-1 · FR-4).

매일: 전 이력 walk-forward 로 칸마다 마지막 블록 적합(원래 + 피처 없는 모델)과 '본 기간 검산
— 참고' 성적을 만든다(판정 아님).
판정은 등록 뒤 낸 예측만으로 판정 날짜에(작업이 `forward_judge` 를 부른다). 매시: 시험 칸 전부(forward
· pass) 예측 p · p_ref.
시험 안 한 칸(국내 1h · 4h)은 `not_tested` 행으로 남겨 화면 사유가 한 곳에서 나온다.
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
    LOOKS,
    CellPanel,
    CellResult,
    Fit,
    ForwardMetrics,
    Rows,
    cell_rows,
    crypto_cell_panel,
    evaluate,
    featureless,
    kr_cell_panel,
    live_quantiles,
    narrow_to_universe,
    walk_forward,
)
from salt_forecast.scoring.base_rate import kr_costs
from salt_forecast.scoring.rule_ic_kr import (
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
    ref_fit: Fit | None = None  # 피처 없는 같은 모델 — 라이브 p_ref


@dataclass(frozen=True, slots=True)
class LivePrediction:
    symbol: str
    market: str
    horizon: str
    as_of: datetime
    p_up: float
    p_ref: float
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


def _cell(market: str, horizon: str, rows: Rows, n_grid: int, spec_key: str) -> Cell:
    """본 기간 검산(참고) + 라이브용 마지막 적합 둘. 상태는 forward — 판정은 작업이 라이브 표본으로 한다(@3)."""
    spec = CRYPTO_SPECS[spec_key] if market == "crypto" else KR_SPEC
    wf = walk_forward(rows, spec, n_grid)
    ref = walk_forward(featureless(rows), spec, n_grid)
    res = evaluate(market, horizon, rows, wf, spec, ref)
    res.status, res.reason = "forward", "awaiting_live"
    return Cell(res, wf.last_fit, ref.last_fit)


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
            tested.append(_cell("crypto", horizon, rows, cp.panel.dates.size - 1, horizon))
    if kr_1d is not None:
        cp, breaks = kr_panel(kr_1d, _ts(KR_START), as_of)
        run.symbols["kr"] = cp.panel.symbols
        day = (cp.panel.dates // DAY).astype(np.int64)
        label = label_without_breaks(forward_log_return(cp.panel, 1), breaks, 1)
        rows = cell_rows(cp, 1, label, kr_costs(cp.panel, 1), day)
        tested.append(_cell("kr", "1d", rows, cp.panel.dates.size - 1, "1d"))
    run.cells = tested
    if kr_1d is not None:
        for market, horizon in NOT_TESTED:
            run.cells.append(Cell(CellResult(market, horizon, status="not_tested", reason="insufficient_history")))
    return run


def live_predictions(
    cp: CellPanel,
    market: str,
    horizon: str,
    h: int,
    fit: Fit,
    zq: Mapping[str, tuple[float, float, float]],
    ref_fit: Fit | None = None,
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
    p_ref = ref_fit.predict(np.zeros((sel.size, 1))) if ref_fit is not None else np.full(sel.size, np.nan)
    # 격자 시각 = 그 봉을 알 수 있게 된 시각(코인 봉 마감 · 국내 16:00 KST — session_panel 이 이미 되돌려 준다)
    when = datetime.fromtimestamp(int(cp.panel.dates[last]), tz=UTC)
    for k, i in enumerate(sel):
        q = live_quantiles(dict(zq), float(p[k]), float(rows.sigma_h[i]))
        if q is None:
            continue
        sym = cp.panel.symbols[int(rows.sym[i])]
        price = float(cp.panel.close[last, int(rows.sym[i])])
        out.append(
            LivePrediction(
                sym,
                market,
                horizon,
                when,
                float(p[k]),
                float(p_ref[k]),
                q[0],
                q[1],
                q[2],
                price,
                price * math.exp(q[0]),
            )
        )
    return out


def _pct(x: float, digits: int = 1) -> str:
    return "—" if not math.isfinite(x) else f"{x * 100:.{digits}f}%"


def _num(x: float, digits: int = 4) -> str:
    return "—" if not math.isfinite(x) else f"{x:+.{digits}f}"


def render_report(
    key: str,
    git_sha: str,
    as_of: datetime,
    run: TestRun,
    forward: Mapping[str, ForwardMetrics],
    look: int | None,
) -> str:
    lines = [
        f"# 단타 방향 확률 전진 시험 — `{key}` ({as_of.date().isoformat()})",
        "",
        f"- 사전등록 `preregistration/2026-11-11-short-direction-3.toml`"
        f" · 코드 `{git_sha}` · as_of {as_of.isoformat()}",
        f"- 판정 날짜 {' · '.join(LOOKS)} 에만 판정(α 0.05/3 · 그날 칸들 Holm). 오늘은 "
        + (
            f"**판정 날짜 {look + 1}번째**"
            if look is not None
            else "판정 날짜가 아니다 — 아래 라이브 숫자는 **참고(판정 아님)**"
        ),
        "- 기준: 피처 없는 같은 모델(같은 오프셋 · 같은 Beta 보정) · 확신 적중은 **늘 많은 쪽**(늘 오른다"
        " · 늘 안 오른다 중 큰 쪽) 대비",
        "- 라벨 = 오름(r > 0) — '그대로'는 안 오름 쪽이다(화면 '안 올랐어요(내렸거나 그대로)')",
        "",
        "## 라이브(등록 뒤 낸 예측만)",
        "",
        "| 칸 | 상태 | 사유 | 채점 행 | 날 | BSS(피처 몫) | 95% | ECE"
        " | 확신 행 | 확신 적중 | 늘 많은 쪽 | 차 95% | '오름' 확신 | 비용 뒤 평균 |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for c in run.cells:
        r = c.result
        k = f"{r.market}:{r.horizon}"
        m = forward.get(k)
        if r.status == "not_tested":
            lines.append(f"| {k} | 시험 안 함 | {r.reason} |" + " — |" * 11)
            continue
        if m is None or m.rows == 0:
            lines.append(f"| {k} | {r.status} | {r.reason or '—'} | 0 |" + " — |" * 10)
            continue
        hit = m.hits / m.confident if m.confident else float("nan")
        maj = m.majority_hits / m.confident if m.confident else float("nan")
        lines.append(
            f"| {k} | {r.status} | {r.reason or '—'} | {m.rows:,} | {m.days} | {_num(m.bss)} | {_num(m.bss_lo)} ~ "
            f"{_num(m.bss_hi)} | {m.ece:.4f} | {m.confident:,} | {_pct(hit)} | {_pct(maj)} | {_pct(m.edge_lo)} ~ "
            f"{_pct(m.edge_hi)} | {m.up_calls:,} | {_pct(m.net_mean, 3)} |"
        )
    lines += [
        "",
        "## 본 기간 검산 — 참고(판정 아님 · @1 · @2 · 진단으로 이미 본 기간)",
        "",
        "| 칸 | 평가 행 | 기간 | BSS(피처 몫) | 95% | BSS(기후값)"
        " | ECE | 확신 행 | 확신 적중 | 차(늘 많은 쪽) 95% | 비용 뒤 오름 |",
        "|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for c in run.cells:
        r = c.result
        if r.status == "not_tested" or not r.rows:
            continue
        a = datetime.fromtimestamp(r.window[0], tz=UTC).date()
        z = datetime.fromtimestamp(r.window[1], tz=UTC).date()
        hit = r.confident_hits / r.confident if r.confident else float("nan")
        lines.append(
            f"| {r.market}:{r.horizon} | {r.rows:,} | {a} ~ {z}"
            f" | {_num(r.bss)} | {_num(r.bss_lo)} ~ {_num(r.bss_hi)} | "
            f"{_num(r.bss_climatology)} | {r.ece:.4f} | {r.confident:,} | {_pct(hit)} | {_pct(r.hit_diff_lo)} ~ "
            f"{_pct(r.hit_diff_hi)} | {_pct(r.net_mean, 3)} |"
        )
    lines += [
        "",
        "## 한계",
        "",
        "- 코인 1시간봉은 지금 상장 종목만(폐지 종목 1시간봉 없음 — 생존 편향). 국내 1"
        " · 4시간은 시험 안 함(5분봉 거래일 < 120)",
        "- 진입 = 격자 행 종가 — 실제 산 가격과 다를 수 있는 근사",
    ]
    return "\n".join(lines) + "\n"

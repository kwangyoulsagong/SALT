"""밴드 적립 검산 실행 — 사전등록 band-accumulation@1(FC-REQ-029 · F003 v2 순서 1).

자산마다: 매주 월요일 지표 → 밴드 → 배수, 평가 시각 T 에 닫힌 주의 52주 수익률로 배수 가중 − 정액(확장 창 워크포워드),
관문 · 실패 사례 · 이번 주(T 이하 마지막 월요일) 판정. 계산은 domain, 여기는 순서와 묶기만.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime

from salt_forecast.domain.accumulation import (
    BTC_BANDS,
    BTC_CASES,
    KOSPI_BANDS,
    KOSPI_CASES,
    Band,
    Case,
    CaseRule,
    Gate,
    Kimchi,
    Reading,
    Stats,
    Week,
    band_of,
    btc_reading,
    evaluate,
    failure_cases,
    gate,
    is_closed,
    kospi_reading,
    label_return,
    latest_point,
    mondays,
)
from salt_forecast.domain.asof_series import VintagedSeries

BTC = "btc"
KOSPI = "kospi"
# 검산을 시작하는 첫 결정일 — 그 전에는 지표가 값이 없다(BTC 365일 · 코스피 60달)
START = {
    BTC: int(datetime(2011, 7, 18, tzinfo=UTC).timestamp()),
    KOSPI: int(datetime(2009, 1, 5, tzinfo=UTC).timestamp()),
}


@dataclass(frozen=True, slots=True)
class AssetResult:
    asset: str
    indicator: str
    plan_week: int  # 이번 주 결정일(T 이하 마지막 월요일)
    reading: Reading | None
    band: Band | None
    gate: Gate
    multiplier: float  # 화면 배수 — 관문 통과면 밴드 배수, 아니면 1.0
    stats: Stats
    cases: list[Case]
    case_count: int
    kimchi: Kimchi | None


@dataclass(frozen=True, slots=True)
class Inputs:
    mvrv: VintagedSeries
    mcap: VintagedSeries
    btc_price: VintagedSeries
    kospi_per: VintagedSeries
    kospi_index: VintagedSeries
    kospi_dividend: VintagedSeries | None
    kimchi: Callable[[int], Kimchi | None] | None


def _run_asset(
    asset: str,
    indicator: str,
    read: Callable[[int], Reading | None],
    value_for_band: Callable[[Reading], float],
    bands: Sequence[Band],
    price: VintagedSeries,
    rule: CaseRule,
    as_of: int,
    kimchi: Kimchi | None,
) -> AssetResult:
    days = mondays(START[asset], as_of)
    weeks: list[Week] = []
    buy_prices: list[float] = []
    for t in days:
        r = read(t)
        if r is None:
            continue
        b = band_of(value_for_band(r), bands)
        ret = label_return(t, price) if is_closed(t, as_of) else None
        p = latest_point(price, 2**62, t - 1)
        weeks.append(Week(t, b.multiplier, b.key, ret))
        buy_prices.append(p[1] if p is not None else 0.0)
    stats = evaluate(weeks, buy_prices)
    plan_week = days[-1] if days else as_of
    reading = read(plan_week)
    band = band_of(value_for_band(reading), bands) if reading is not None else None
    g = gate(stats, reading is not None)
    cases, n_cases = failure_cases(weeks, rule)
    multiplier = band.multiplier if (g.passed and band is not None) else 1.0
    return AssetResult(asset, indicator, plan_week, reading, band, g, multiplier, stats, cases, n_cases, kimchi)


def run(inputs: Inputs, as_of: datetime) -> list[AssetResult]:
    t = int(as_of.timestamp())
    plan = mondays(t - 7 * 86_400, t)
    kimchi = inputs.kimchi(plan[-1]) if (inputs.kimchi is not None and plan) else None
    btc = _run_asset(
        BTC,
        "mvrv_z",
        lambda d: btc_reading(d, inputs.mvrv, inputs.mcap),
        lambda r: r.value,
        BTC_BANDS,
        inputs.btc_price,
        BTC_CASES,
        t,
        kimchi,
    )
    kospi = _run_asset(
        KOSPI,
        "per_percentile",
        lambda d: kospi_reading(d, inputs.kospi_per, inputs.kospi_index, inputs.kospi_dividend),
        lambda r: r.percentile if r.percentile is not None else float("nan"),
        KOSPI_BANDS,
        inputs.kospi_index,
        KOSPI_CASES,
        t,
        None,
    )
    return [btc, kospi]


def _d(epoch: int | None) -> str:
    return "—" if epoch is None else datetime.fromtimestamp(epoch, tz=UTC).date().isoformat()


def _pct(x: float | None) -> str:
    return "—" if x is None else f"{x * 100:+.1f}%p"


def render_report(key: str, sha: str, as_of: datetime, results: Sequence[AssetResult]) -> str:
    lines = [
        f"# 밴드 적립 검산 — `{key}` · {as_of.date().isoformat()}",
        "",
        f"사전등록 `preregistration/2026-11-19-band-accumulation.toml` · 코드 `{sha}` · 평가 시각 {as_of.isoformat()}.",
        "지표 E = 52주 뒤 수익률의 배수 가중 평균 − 같은 주 정액 평균(원당 %p).",
        "관문 = 닫힌 주 ≥ 260 이고 E 의 90% 하한 > 0.",
        "표본 선택: 지수 · BTC 한 자산씩(생존 편향 없음) · 지표가 값을 낸 매주 월요일 전부.",
        "",
        "| 자산 | 닫힌 주 | 창 | E | 90% 구간 | 양수 연도 | 원당 수량(밴드 ÷ 정액) | 관문 | 이번 주 밴드 | 화면 배수 |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in results:
        s = r.stats
        lines.append(
            f"| {r.asset} | {s.n} | {_d(s.window_from)} ~ {_d(s.window_to)} | {_pct(s.excess)} | "
            f"{_pct(s.ci_low)} ~ {_pct(s.ci_high)} | {s.years_positive}/{s.years_total} | "
            f"{'—' if s.units_per_won_ratio is None else f'{s.units_per_won_ratio:.3f}'} | "
            f"{'통과' if r.gate.passed else r.gate.reason} | {'—' if r.band is None else r.band.key} | {r.multiplier} |"
        )
    for r in results:
        lines += ["", f"## {r.asset} — 연도별 E", "", "| 연도 | 주 | E |", "|---|---|---|"]
        lines += [f"| {y} | {n} | {_pct(e)} |" for y, n, e in r.stats.by_year]
        lines += [
            "",
            f"### 실패 사례 {r.case_count}건(상위 {len(r.cases)})",
            "",
            "| 결정일 | 종류 | 밴드 · 배수 | 52주 뒤 |",
            "|---|---|---|---|",
        ]
        lines += [f"| {_d(c.t)} | {c.kind} | {c.band} × {c.multiplier} | {c.ret * 100:+.1f}% |" for c in r.cases]
        if r.reading is not None:
            rd = r.reading
            extra = "" if rd.percentile is None else f" · 백분위 {rd.percentile * 100:.0f}"
            lines += [
                "",
                f"이번 주({_d(r.plan_week)}) 지표 {rd.value:.3f}{extra} · 근거 관측 {_d(rd.basis_observed)}"
                + (" · 추정" if rd.estimated else ""),
            ]
        if r.kimchi is not None:
            lines.append(f"김치 프리미엄 {r.kimchi.premium * 100:+.2f}% ({_d(r.kimchi.as_of)})")
    return "\n".join(lines) + "\n"

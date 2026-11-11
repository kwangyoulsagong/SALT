"""조건부 기저율 통계 — 사전등록 `base-rate@1`(FC-REQ-028 FR-2). I/O 없음.

한 조건 · 한 지평의 사건 묶음(사건마다 날짜 · 비용 뒤 수익 · 비용 전 수익)을 받아 화면이 서술할 숫자를 낸다.
숫자 하나하나의 정의는 사전등록 파일의 [protocol] 이 원문이다 — 여기 상수는 그것을 옮긴 것이다.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date

import numpy as np
from numpy.typing import NDArray

KEY = "base-rate@1"
MIN_EFFECTIVE_N = 100.0
MIN_DAYS = 60
KAPPA = 100.0  # 수축 강도(평소 쪽으로 당기는 가상 표본 수)
RECENT_DAYS = 365
RECENT_MIN_EFFECTIVE_N = 30.0
HOLM_ALPHA = 0.05
Z95 = 1.959963984540054

# 비용 — salt-server coach/domain/policy/krStockCost.ts 와 같은 표(둘이 갈라지면 점검과 채점이 다른 비용을 쓴다)
KR_COMMISSION_PER_SIDE = 0.000186
KR_SELL_TAX: tuple[tuple[date, float], ...] = (
    (date(2021, 1, 1), 0.0023),
    (date(2023, 1, 1), 0.002),
    (date(2024, 1, 1), 0.0018),
    (date(2025, 1, 1), 0.0015),
    (date(2026, 1, 1), 0.002),
)
CRYPTO_ROUND_TRIP = 0.0015  # 수수료 0.05% × 2 + 스프레드 근사 0.05%

# KRX 호가 단위(2023-01-25 통합 — 코스피 · 코스닥 같음). (이 가격 미만, 단위)
_KRX_TICKS: tuple[tuple[float, float], ...] = (
    (2_000, 1),
    (5_000, 5),
    (20_000, 10),
    (50_000, 50),
    (200_000, 100),
    (500_000, 500),
)
_KRX_TOP_TICK = 1_000.0


def krx_tick(price: float) -> float:
    for bound, tick in _KRX_TICKS:
        if price < bound:
            return tick
    return _KRX_TOP_TICK


def kr_sell_tax(day: date) -> float:
    rate = KR_SELL_TAX[0][1]
    for start, r in KR_SELL_TAX:
        if start <= day:
            rate = r
    return rate


def kr_round_trip(sold_on: date, entry_price: float) -> float:
    """수수료 × 2 + 매도일 거래세 + 반 틱 × 2(호가 단위 / 진입가)."""
    return KR_COMMISSION_PER_SIDE * 2 + kr_sell_tax(sold_on) + krx_tick(entry_price) / entry_price


@dataclass(frozen=True, slots=True)
class Events:
    """한 조건 · 한 지평의 사건. 배열 길이가 같다. day = 사건 날(epoch 일 수 — 군집 키)."""

    day: NDArray[np.int64]
    net: NDArray[np.float64]  # 비용 뒤 로그수익(사기 전)
    gross: NDArray[np.float64]  # 비용 전 로그수익(팔기 전 보유 연장)

    def __post_init__(self) -> None:
        if not (self.day.shape == self.net.shape == self.gross.shape):
            raise ValueError("사건 배열 길이가 다르다")

    @property
    def n(self) -> int:
        return int(self.day.size)

    def since(self, first_day: int) -> Events:
        keep = self.day >= first_day
        return Events(self.day[keep], self.net[keep], self.gross[keep])


def icc_oneway(y: NDArray[np.float64], group: NDArray[np.int64]) -> float:
    """일원 분산분석 ICC(1) — 같은 날 사건끼리의 상관. 군집 크기가 달라도 되는 n0 보정. [0, 1] 로 자른다."""
    if y.size < 3:
        return 0.0
    _, inv, counts = np.unique(group, return_inverse=True, return_counts=True)
    k = counts.size
    n = y.size
    if k < 2 or k == n:
        return 0.0
    means = np.bincount(inv, weights=y) / counts
    grand = float(y.mean())
    ssb = float(np.sum(counts * (means - grand) ** 2))
    ssw = float(np.sum((y - means[inv]) ** 2))
    msb = ssb / (k - 1)
    msw = ssw / (n - k)
    n0 = (n - float(np.sum(counts**2)) / n) / (k - 1)
    denom = msb + (n0 - 1) * msw
    if denom <= 0:
        return 0.0
    return min(1.0, max(0.0, (msb - msw) / denom))


def effective_n(y: NDArray[np.float64], group: NDArray[np.int64]) -> float:
    """n / 설계 효과, 설계 효과 = 1 + (m̄ − 1)ρ, m̄ = Σm²/Σm."""
    n = y.size
    if n == 0:
        return 0.0
    _, counts = np.unique(group, return_counts=True)
    m_bar = float(np.sum(counts.astype(np.float64) ** 2)) / n
    deff = 1.0 + (m_bar - 1.0) * icc_oneway(y, group)
    return n / deff


def wilson(p: float, n: float) -> tuple[float, float]:
    """95% Wilson 구간 — n 은 유효 n(실수 허용)."""
    if n <= 0:
        return (0.0, 1.0)
    z2 = Z95 * Z95
    centre = (p + z2 / (2 * n)) / (1 + z2 / n)
    half = Z95 * math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / (1 + z2 / n)
    return (max(0.0, centre - half), min(1.0, centre + half))


def shrink(p: float, n_eff: float, p0: float, kappa: float = KAPPA) -> float:
    return (p * n_eff + kappa * p0) / (n_eff + kappa)


def two_sided_p(p: float, n_eff: float, p0: float) -> float:
    """원비율 vs 평소 p₀(고정) 양측 z 검정."""
    if n_eff <= 0 or p0 <= 0 or p0 >= 1:
        return 1.0
    z = (p - p0) / math.sqrt(p0 * (1 - p0) / n_eff)
    return math.erfc(abs(z) / math.sqrt(2))


def holm(pvalues: Sequence[float]) -> list[float]:
    """Holm 보정 p(단조) — 입력 순서 그대로."""
    m = len(pvalues)
    order = sorted(range(m), key=lambda i: pvalues[i])
    out = [1.0] * m
    running = 0.0
    for rank, i in enumerate(order):
        running = max(running, min(1.0, (m - rank) * pvalues[i]))
        out[i] = running
    return out


@dataclass(frozen=True, slots=True)
class Stat:
    """한 조건 · 한 지평의 서술. status = below_min 이면 비율 · 분위가 None."""

    status: str
    sample: int
    sample_eff: float
    sample_days: int
    up_rate: float | None
    up_low: float | None
    up_high: float | None
    mean: float | None
    q10: float | None
    q50: float | None
    q90: float | None
    hold_up_rate: float | None
    hold_q10: float | None
    hold_q50: float | None
    hold_q90: float | None
    recent_differs: bool | None


def describe(ev: Events, recent_from_day: int) -> Stat:
    """비율 · 분위 · 유효 n. 수축 · Holm 은 시장 전체를 본 뒤(`finalize`)."""
    up = (ev.net > 0).astype(np.float64)
    n_eff = effective_n(up, ev.day)
    days = int(np.unique(ev.day).size)
    if n_eff < MIN_EFFECTIVE_N or days < MIN_DAYS:
        return Stat("below_min", ev.n, n_eff, days, *([None] * 12))
    p = float(up.mean())
    lo, hi = wilson(p, n_eff)
    q10, q50, q90 = (float(x) for x in np.quantile(ev.net, (0.1, 0.5, 0.9)))
    h10, h50, h90 = (float(x) for x in np.quantile(ev.gross, (0.1, 0.5, 0.9)))
    recent = ev.since(recent_from_day)
    recent_differs: bool | None = None
    if recent.n:
        r_up = (recent.net > 0).astype(np.float64)
        if effective_n(r_up, recent.day) >= RECENT_MIN_EFFECTIVE_N:
            r = float(r_up.mean())
            recent_differs = r < lo or r > hi
    return Stat(
        "ok", ev.n, n_eff, days, p, lo, hi, float(ev.net.mean()), q10, q50, q90,
        float((ev.gross > 0).mean()), h10, h50, h90, recent_differs,
    )  # fmt: skip


@dataclass(frozen=True, slots=True)
class Verdict:
    up_rate_shrunk: float | None
    p_holm: float | None
    differs: str | None  # higher | lower


def finalize(stats: Sequence[Stat], tested: Sequence[bool], p0: float | None) -> list[Verdict]:
    """한 시장의 조건 × 지평 가족 — 수축 · Holm. tested = False(평소 · 서술 조건)는 검정 밖."""
    raw = [
        two_sided_p(s.up_rate, s.sample_eff, p0) if t and s.up_rate is not None and p0 is not None else None
        for s, t in zip(stats, tested, strict=True)
    ]
    family = [(i, p) for i, p in enumerate(raw) if p is not None]  # p = 0.0 도 값이다(`or` 로 거르면 1.0 이 된다)
    adj = holm([p for _, p in family])
    adjusted: dict[int, float] = {i: q for (i, _), q in zip(family, adj, strict=True)}
    out: list[Verdict] = []
    for i, s in enumerate(stats):
        if s.up_rate is None or p0 is None:
            out.append(Verdict(None, None, None))
            continue
        shrunk = shrink(s.up_rate, s.sample_eff, p0)
        ph = adjusted.get(i)
        differs = None
        if ph is not None and ph < HOLM_ALPHA and shrunk != p0:
            differs = "higher" if shrunk > p0 else "lower"
        out.append(Verdict(shrunk, ph, differs))
    return out


@dataclass(frozen=True, slots=True)
class StatRow:
    market: str
    condition_id: str
    horizon: int
    kind: str
    stat: Stat
    verdict: Verdict


@dataclass(frozen=True, slots=True)
class Trigger:
    market: str
    symbol: str
    condition_id: str
    ref_close: float
    ref_at: int  # 기준 봉 available_at(epoch 초)
    applies_to: str = "next"  # next = 다음 장 문턱 · closed = 마지막 봉 종가에 이미 성립(문턱 없음)
    price_at_least: float | None = None
    price_at_most: float | None = None
    open_at_least: float | None = None
    value_at_least: float | None = None


def cooldown(rows: NDArray[np.bool_], h: int) -> NDArray[np.bool_]:
    """종목(열)마다 사건 뒤 h 행 안의 다음 사건을 지운다 — 겹치는 라벨로 표본을 부풀리지 않는다."""
    out = np.zeros_like(rows)
    for j in range(rows.shape[1]):
        last = -(10**9)
        for t in np.flatnonzero(rows[:, j]):
            if t - last >= h:
                out[t, j] = True
                last = int(t)
    return out


def rsi_threshold_price(last_close: float, gains13: float, losses13: float) -> float:
    """다음 봉 가격 p 가 RSI(14, 단순 합) ≥ 70 이 되는 최소값(p ≥ 직전 종가 구간).

    창 = 직전 13개 차분 + (p − 직전 종가). RS = G/L(L = 0 이면 1, 서버 calculateRSI 그대로) ≥ 7/3.
    """
    loss = losses13 if losses13 > 0 else 1.0
    return last_close + max(0.0, 7.0 / 3.0 * loss - gains13)

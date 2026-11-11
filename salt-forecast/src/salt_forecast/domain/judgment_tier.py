"""종목 판단 라벨 등급 — 순수 계산(사전등록 `judgment-tier@1` · FC-REQ-028 FR-6 · F017 v2 단계 4). I/O 없음.

등급은 판단을 숨기지 않는다. 라벨 무게만 정한다:
- 검증됨: 라이브만 — Holm 보정 p < 0.05 · 유효 n ≥ 620 · 두 반 spread > 0(마지막 강등 뒤 행만)
- 주의: spread 95% CI 상한 < 0 — 라이브 또는 backtest_full
- 참고: 그 외 전부(기본)

spread = mean(후보 초과 순수익) − mean(피하기 초과), 초과 = 같은 날 같은 칸 채점 행 전부의 동일가중 평균 대비.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime, timedelta

import numpy as np

from salt_forecast.domain.base_rate import KR_COMMISSION_PER_SIDE, kr_sell_tax

KEY = "judgment-tier@1"
RULE_VERSION = "mode-decision@2"
MARKETS = ("crypto", "kr")
MODES = ("scalp", "long_term")
CRYPTO_ROUND_TRIP = 0.001  # 라이브 ROUND_TRIP_COST — 원장 채점과 같은 값(base-rate 의 0.15% 와 다르다: 등록이 다르다)
RHO = {"crypto": 0.5, "kr": 0.3}
MIN_EFFECTIVE_N = 620.0
ALPHA = 0.05
REPS = 2000
SEED = 20261111
DEMOTION_WINDOW = timedelta(days=91)

REASONS = ("no_candidate", "no_avoid", "below_effective_n", "ci_includes_zero", "regimes_disagree")


def is_candidate(action: str) -> bool:
    return action.startswith("review_")


def is_avoid(action: str) -> bool:
    return action == "avoid"


def round_trip(market: str, day: date) -> float:
    """후보 왕복 비용 — 코인 0.1% · 국내 수수료 × 2 + 판단 날 연도의 거래세(반 틱은 등록에 없다)."""
    if market == "crypto":
        return CRYPTO_ROUND_TRIP
    return KR_COMMISSION_PER_SIDE * 2 + kr_sell_tax(day)


@dataclass(frozen=True, slots=True)
class Row:
    """채점된 판단 한 줄. day = 판단 날(KST) — 군집 키."""

    day: date
    judged_at: datetime
    action: str
    r: float  # 비용 전 수익(원장 return_rate)


@dataclass(frozen=True, slots=True)
class CellStat:
    rows: int
    days: int
    candidates: int
    avoids: int
    effective_n: float
    spread: float | None
    ci_low: float | None
    ci_high: float | None
    p: float | None  # 단측(spread ≤ 0) — spread 가 없으면 None
    discarded: int  # 후보나 피하기가 빠져 버린 부트스트랩 회차


EMPTY = CellStat(0, 0, 0, 0, 0.0, None, None, None, None, 0)


def _excess(rows: Sequence[Row], market: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """(날 번호, 후보/피하기 표지 −1·0·+1, 초과) — 관망은 날 평균에만 들어가고 spread 에는 안 든다."""
    days = sorted({r.day for r in rows})
    index = {d: i for i, d in enumerate(days)}
    day_idx = np.fromiter((index[r.day] for r in rows), dtype=np.int64, count=len(rows))
    rets = np.fromiter((r.r for r in rows), dtype=np.float64, count=len(rows))
    sums = np.bincount(day_idx, weights=rets, minlength=len(days))
    counts = np.bincount(day_idx, minlength=len(days))
    mean_d = sums / counts
    side = np.fromiter(
        ((1 if is_candidate(r.action) else -1 if is_avoid(r.action) else 0) for r in rows),
        dtype=np.int8,
        count=len(rows),
    )
    cost = np.fromiter(
        ((round_trip(market, r.day) if is_candidate(r.action) else 0.0) for r in rows),
        dtype=np.float64,
        count=len(rows),
    )
    return day_idx, side, rets - cost - mean_d[day_idx]


def _spread(side: np.ndarray, excess: np.ndarray, weight: np.ndarray) -> float | None:
    """weight = 행마다 뽑힌 횟수(부트스트랩) · 원 표본이면 1."""
    wc = weight * (side == 1)
    wa = weight * (side == -1)
    nc, na = wc.sum(), wa.sum()
    if nc == 0 or na == 0:
        return None
    return float((wc * excess).sum() / nc - (wa * excess).sum() / na)


def effective_n(day_counts: Sequence[int], rho: float) -> float:
    """판단 날 수 × m̄ / (1 + (m̄ − 1)ρ) — m̄ = 날마다 후보 + 피하기 행 수 평균."""
    nonzero = [c for c in day_counts if c > 0]
    if not nonzero:
        return 0.0
    m = sum(nonzero) / len(nonzero)
    return len(nonzero) * m / (1 + (m - 1) * rho)


def measure(rows: Sequence[Row], market: str, *, reps: int = REPS, seed: int = SEED) -> CellStat:
    if not rows:
        return EMPTY
    day_idx, side, excess = _excess(rows, market)
    n_days = int(day_idx.max()) + 1
    directional = side != 0
    per_day = np.bincount(day_idx[directional], minlength=n_days)
    neff = effective_n(per_day.tolist(), RHO[market])
    base = _spread(side, excess, np.ones(len(rows)))
    stat = CellStat(
        rows=len(rows),
        days=n_days,
        candidates=int((side == 1).sum()),
        avoids=int((side == -1).sum()),
        effective_n=neff,
        spread=base,
        ci_low=None,
        ci_high=None,
        p=None,
        discarded=0,
    )
    if base is None:
        return stat
    rng = np.random.default_rng(seed)
    draws: list[float] = []
    discarded = 0
    for _ in range(reps):
        picked = np.bincount(rng.integers(0, n_days, n_days), minlength=n_days)  # 날짜를 통째로
        s = _spread(side, excess, picked[day_idx].astype(np.float64))
        if s is None:
            discarded += 1
            continue
        draws.append(s)
    if not draws:
        return CellStat(stat.rows, stat.days, stat.candidates, stat.avoids, neff, base, None, None, None, discarded)
    arr = np.asarray(draws)
    low, high = np.percentile(arr, [2.5, 97.5])
    p = (int((arr <= 0).sum()) + 1) / (len(arr) + 1)
    return CellStat(
        stat.rows, stat.days, stat.candidates, stat.avoids, neff, base, float(low), float(high), p, discarded
    )


def halves(rows: Sequence[Row], market: str) -> tuple[float | None, float | None]:
    """판단 날 시간순 반 나눔(홀수면 가운데 날은 앞) — 각 반의 spread."""
    days = sorted({r.day for r in rows})
    if len(days) < 2:
        return None, None
    cut = days[(len(days) + 1) // 2 - 1]
    first = [r for r in rows if r.day <= cut]
    second = [r for r in rows if r.day > cut]

    def one(part: Sequence[Row]) -> float | None:
        if not part:
            return None
        _, side, excess = _excess(part, market)
        return _spread(side, excess, np.ones(len(part)))

    return one(first), one(second)


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
class Previous:
    tier: str
    demoted_at: datetime | None


@dataclass(frozen=True, slots=True)
class Decision:
    tier: str
    reason: str | None
    basis_source: str | None
    demoted_at: datetime | None


def _reference_reason(stat: CellStat, p_holm: float | None, regimes: tuple[float | None, float | None]) -> str:
    if stat.candidates == 0:
        return "no_candidate"
    if stat.avoids == 0:
        return "no_avoid"
    if stat.effective_n < MIN_EFFECTIVE_N:
        return "below_effective_n"
    if p_holm is None or p_holm >= ALPHA:
        return "ci_includes_zero"
    return "regimes_disagree"


def _caution(stat: CellStat | None) -> bool:
    return stat is not None and stat.ci_high is not None and stat.ci_high < 0


def decide(
    *,
    live: CellStat,
    promote: CellStat,
    promote_p_holm: float | None,
    regimes: tuple[float | None, float | None],
    backtest_full: CellStat | None,
    recent: CellStat,
    previous: Previous | None,
    now: datetime,
) -> Decision:
    """`promote` = 마지막 강등 뒤 라이브(강등이 없으면 `live` 와 같다). `recent` = 최근 13주 라이브."""
    demoted_at = previous.demoted_at if previous else None
    if previous is not None and previous.tier == "verified" and recent.ci_high is not None and recent.ci_high < 0:
        demoted_at = now
        promote = EMPTY  # 강등 뒤 행이 아직 없다 — 같은 데이터로 다시 올리지 않는다
        promote_p_holm = None
        regimes = (None, None)
    first, second = regimes
    verified = (
        promote.spread is not None
        and promote_p_holm is not None
        and promote_p_holm < ALPHA
        and promote.effective_n >= MIN_EFFECTIVE_N
        and first is not None
        and second is not None
        and first > 0
        and second > 0
    )
    if verified:
        return Decision("verified", None, "live", demoted_at)
    if _caution(live):
        return Decision("caution", None, "live", demoted_at)
    if _caution(backtest_full):
        return Decision("caution", None, "backtest_full", demoted_at)
    return Decision("reference", _reference_reason(promote, promote_p_holm, regimes), None, demoted_at)

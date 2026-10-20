"""커버리지 리포트 — 위 · 아래 꼬리 따로(FC-REQ-020 FR-4).

전체 90% 커버리지가 맞아도 위로 8% · 아래로 2% 빠지면 구간이 한쪽으로 기운 것이다(국내 실력 감사에서 본 것).
그래서 꼬리를 나눠 명목 5% 와 비교한다.

- 매 h번째 주만 쓴다 — 겹치는 h주 라벨은 이웃 주가 같은 사건을 두 번 센다
- 표준오차는 **날짜 클러스터**(같은 주 종목들은 같은 시장 충격을 받는다). Kupiec · Christoffersen 은 종목을 독립으로
  보는 순진한 값이라 참고용으로만 같이 싣는다
- 사전 σ̂ 버킷 = 그 행 90% 폭의 기간 안 3분위(as_of 에 아는 값)
"""

from __future__ import annotations

import math
from collections import defaultdict
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass
from itertools import pairwise

import numpy as np

from salt_forecast.domain.pooled import chi2_1_sf

TAIL_NOMINAL = 0.05


@dataclass(frozen=True, slots=True)
class TailObs:
    symbol: str
    horizon_weeks: int
    as_of: int
    lo90: float
    hi90: float
    realized: float

    @property
    def upper(self) -> bool:
        return self.realized > self.hi90

    @property
    def lower(self) -> bool:
        return self.realized < self.lo90


@dataclass(frozen=True, slots=True)
class TailRate:
    n: int
    dates: int
    rate: float
    cluster_se: float
    kupiec_p: float  # 순진한 값(종목 독립 가정)


def nonoverlapping(obs: Sequence[TailObs], h: int) -> list[TailObs]:
    """매 h번째 주(첫 주부터)."""
    dates = sorted({o.as_of for o in obs})
    keep = set(dates[::h])
    return [o for o in obs if o.as_of in keep]


def _kupiec(x: int, n: int, p: float) -> float:
    if n == 0:
        return float("nan")
    pi = x / n

    def ll(q: float) -> float:
        a = (n - x) * math.log(1 - q) if n - x else 0.0
        b = x * math.log(q) if x else 0.0
        return a + b

    return chi2_1_sf(-2.0 * (ll(p) - ll(pi)))  # π 가 0 · 1 이면 ll(π) = 0


def tail_rate(obs: Sequence[TailObs], hit: Sequence[bool]) -> TailRate:
    n = len(obs)
    if n == 0:
        return TailRate(0, 0, float("nan"), float("nan"), float("nan"))
    y = np.asarray(hit, dtype=np.float64)
    p = float(y.mean())
    by_date: dict[int, float] = defaultdict(float)
    for o, v in zip(obs, y.tolist(), strict=True):
        by_date[o.as_of] += v - p
    se = math.sqrt(sum(s * s for s in by_date.values())) / n
    return TailRate(n, len(by_date), p, se, _kupiec(int(y.sum()), n, TAIL_NOMINAL))


def christoffersen_ind(obs: Sequence[TailObs]) -> float:
    """90% 밖 여부의 1차 마르코프 독립 검정 p(종목별 연속 관측의 전이를 합산)."""
    seqs: dict[str, list[tuple[int, bool]]] = defaultdict(list)
    for o in obs:
        seqs[o.symbol].append((o.as_of, o.upper or o.lower))
    n = np.zeros((2, 2))
    for s in seqs.values():
        s.sort()
        for (_, a), (_, b) in pairwise(s):
            n[int(a), int(b)] += 1
    n0, n1 = n[0].sum(), n[1].sum()
    if n0 == 0 or n1 == 0:
        return float("nan")
    p01, p11 = n[0, 1] / n0, n[1, 1] / n1
    p = (n[0, 1] + n[1, 1]) / (n0 + n1)

    def xlogy(x: float, q: float) -> float:
        return x * math.log(q) if x else 0.0

    l0 = xlogy(n[0, 0] + n[1, 0], 1 - p) + xlogy(n[0, 1] + n[1, 1], p)
    l1 = xlogy(n[0, 0], 1 - p01) + xlogy(n[0, 1], p01) + xlogy(n[1, 0], 1 - p11) + xlogy(n[1, 1], p11)
    return chi2_1_sf(-2.0 * (l0 - l1))


def _fmt(t: TailRate) -> str:
    if not t.n:
        return "—"
    return f"{t.rate:.1%} ± {1.96 * t.cluster_se:.1%}"


def render_coverage(
    title: str, models: Sequence[str], obs_for: Callable[[str], Iterable[TailObs]], horizons: Sequence[int]
) -> list[str]:
    """`obs_for(모델)` 은 그 모델의 관측 — 모델 하나씩만 객체로 든다(FC-REQ-020 P4)."""
    lines = [
        f"## {title}",
        "",
        "명목 각 5%. ± 는 날짜 클러스터 95%(1.96 SE). 매 h번째 주만. Kupiec p 는 종목 독립 가정(참고용)",
        "",
        "| 모델 | 기간 | 표본(주) | 위 꼬리 | 아래 꼬리 | Kupiec p 위 · 아래 | Christoffersen 독립 p |",
        "|---|---|---|---|---|---|---|",
    ]
    buckets: list[str] = []
    for m in models:
        obs_all = list(obs_for(m))
        for h in horizons:
            obs = nonoverlapping([o for o in obs_all if o.horizon_weeks == h], h)
            if not obs:
                continue
            up = tail_rate(obs, [o.upper for o in obs])
            dn = tail_rate(obs, [o.lower for o in obs])
            lines.append(
                f"| `{m}` | {h}주 | {up.n}({up.dates}) | {_fmt(up)} | {_fmt(dn)} | "
                f"{up.kupiec_p:.3f} · {dn.kupiec_p:.3f} | {christoffersen_ind(obs):.3f} |"
            )
            widths = np.asarray([o.hi90 - o.lo90 for o in obs])
            cuts = np.quantile(widths, [1 / 3, 2 / 3])
            for name, sel in (
                ("낮음", widths <= cuts[0]),
                ("중간", (widths > cuts[0]) & (widths <= cuts[1])),
                ("높음", widths > cuts[1]),
            ):
                sub = [o for o, k in zip(obs, sel.tolist(), strict=True) if k]
                bu = tail_rate(sub, [o.upper for o in sub])
                bd = tail_rate(sub, [o.lower for o in sub])
                buckets.append(f"| `{m}` | {h}주 | {name} | {bu.n} | {_fmt(bu)} | {_fmt(bd)} |")
    lines += [
        "",
        "사전 σ̂ 3분위(90% 폭 기준)별",
        "",
        "| 모델 | 기간 | σ̂ | 표본 | 위 꼬리 | 아래 꼬리 |",
        "|---|---|---|---|---|---|",
        *buckets,
        "",
    ]
    return lines

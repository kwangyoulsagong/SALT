"""척도만 따로 채점 — QLIKE(FC-REQ-020 FR-11, 사전등록 `kr-scale@1` [protocol] qlike).

pinball 은 위치 · 형태 · 척도가 섞인 점수라 척도 개선이 위치 잡음에 묻힌다. 보정 **전** 척도 σ̂(일 변동성 × √n)를
h주 실현 수익률 r 로 채점한다: 손실 r²/σ̂² + ln σ̂²(Patton 2011 — 대용치 r² 에 잡음이 있어도 순위가 보존된다).
기준과 같은 (종목, 기간, as_of) 만 짝짓고, 주별 단면 평균 차이를 최근 POOLED_WEEKS 주 블록 부트스트랩한다.
**판정이 아니다** — 판정은 pinball 풀링 게이트 하나다.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass

import numpy as np

from salt_forecast.domain.har import qlike_loss
from salt_forecast.domain.ic import block_bootstrap_mean
from salt_forecast.domain.pooled import block_for
from salt_forecast.scoring.pooled_gate import POOLED_WEEKS


@dataclass(frozen=True, slots=True)
class ScaleObs:
    symbol: str
    horizon_weeks: int
    as_of: int
    scale: float
    realized: float


@dataclass(frozen=True, slots=True)
class QlikeRow:
    weeks: int
    pairs: int
    mean_model: float
    mean_baseline: float
    diff: float  # 주별 평균(모델 − 기준). 음수 = 모델이 낫다
    low: float
    high: float
    better_weeks: float  # 차이 < 0 인 주 비율


def qlike_rows(model: Iterable[ScaleObs], baseline: Iterable[ScaleObs], horizons: Sequence[int]) -> dict[int, QlikeRow]:
    base = {(o.symbol, o.horizon_weeks, o.as_of): o for o in baseline}
    by: dict[int, dict[int, tuple[list[float], list[float]]]] = defaultdict(lambda: defaultdict(lambda: ([], [])))
    for o in model:
        b = base.get((o.symbol, o.horizon_weeks, o.as_of))
        if b is None:
            continue
        r = np.asarray([o.realized])
        ms, bs = by[o.horizon_weeks][o.as_of]
        ms.append(float(qlike_loss(r, np.asarray([o.scale**2]))[0]))
        bs.append(float(qlike_loss(r, np.asarray([b.scale**2]))[0]))
    out: dict[int, QlikeRow] = {}
    for h in horizons:
        weeks = sorted(by[h])[-POOLED_WEEKS:]
        if len(weeks) < 2:
            continue
        m = np.asarray([np.mean(by[h][t][0]) for t in weeks])
        b = np.asarray([np.mean(by[h][t][1]) for t in weeks])
        d = m - b
        lo, hi = block_bootstrap_mean(d, block_for(d, h))
        out[h] = QlikeRow(
            len(weeks),
            sum(len(by[h][t][0]) for t in weeks),
            float(m.mean()),
            float(b.mean()),
            float(d.mean()),
            lo,
            hi,
            float(np.mean(d < 0)),
        )
    return out


def render_qlike(
    title: str, obs_by_model: Mapping[str, Sequence[ScaleObs]], baseline: str, horizons: Sequence[int]
) -> list[str]:
    lines = [
        f"## {title}",
        "",
        f"손실 r²/σ̂² + ln σ̂²(보정 전 척도). 차이 = 주별 단면 평균(모델 − `{baseline}`), 최근 {POOLED_WEEKS}주, "
        "블록 부트스트랩 95%(블록 ≥ h). **음수 = 척도가 낫다**. 참고 — 판정 아님",
        "",
        "| 모델 | 기간 | 주 · 짝 | QLIKE 모델 · 기준 | 차이 | 95% | 나은 주 |",
        "|---|---|---|---|---|---|---|",
    ]
    for m, obs in obs_by_model.items():
        if m == baseline:
            continue
        for h, r in sorted(qlike_rows(obs, obs_by_model[baseline], horizons).items()):
            lines.append(
                f"| `{m}` | {h}주 | {r.weeks} · {r.pairs:,} | {r.mean_model:.4f} · {r.mean_baseline:.4f} | "
                f"{r.diff:+.4f} | [{r.low:+.4f}, {r.high:+.4f}] | {r.better_weeks:.0%} |"
            )
    return [*lines, ""]

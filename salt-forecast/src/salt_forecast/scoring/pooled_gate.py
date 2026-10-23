"""국내 주식 풀링 게이트 · 상시 플라시보 조립(FC-REQ-020 FR-1 · FR-2 · FR-5). 계산은 `domain/pooled`.

1. 짝지은 점수(`paired_scores`)에서 기간마다 주별 단면 d̄_t 를 만든다 — 최근 POOLED_WEEKS 주
2. 기간 4개를 한 가족으로 검정(`pooled_verdicts`) → 기간별 통과
3. 종목은 거부권만(`gates_from_pairs(pooled=…)`)

플라시보: 연속 BLOCK_WEEKS 주 묶음마다 동전을 던져 그 주들의 모델 · 기준 점수를 **모든 종목 · 기간에서 함께**
맞바꾼다(실력 0 이면 둘은 교환 가능하다). 같은 게이트를 다시 돌려 켜진 카드 수의 귀무 분포를 얻는다.
거짓 발견 비율 = 귀무 평균 ÷ 관측. 블록 = 8주 ≥ 최장 기간 4주 — 겹치는 라벨과 같은 주 시장 충격을 함께 옮긴다.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass, replace
from datetime import datetime
from itertools import pairwise

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.kr_status import StatusReason
from salt_forecast.domain.pooled import ALPHA, PooledResult, block_flips, pooled_verdicts, weekly_skill
from salt_forecast.domain.scoring import COVERAGE90_MAX, COVERAGE90_MIN, GATE_WINDOW, MIN_GATE_SAMPLE, Score
from salt_forecast.scoring.evaluate import Paired, gates_from_pairs, paired_scores
from salt_forecast.store.predictions import GateRow, ScoreRow

# 풀링 검정 창 — 2년. 종목 게이트(52주)보다 길게 본다: 단면 평균 한 줄은 주당 관측 하나라 52주면 유효 표본이
# 52/h 다(4주면 13). 결과를 보기 전에 정했다(2026-10-09)
POOLED_WEEKS = 104
BLOCK_WEEKS = 8
PLACEBO_REPS = 200
PLACEBO_SEED = 20261009
FALSE_DISCOVERY_MAX = 0.20


def weekly_d(pairs: Mapping[tuple[str, int], Paired], skip: int = 0) -> dict[int, tuple[list[datetime], np.ndarray]]:
    """기간 → (주, d̄_t). 그 주에 짝지은 종목 전부의 평균 pinball 로. `skip` = 최근 몇 주를 빼고 그 앞 창을 본다
    (사전등록 `kr-scale@2` 이전 창)."""
    acc: dict[int, dict[datetime, tuple[list[float], list[float]]]] = defaultdict(lambda: defaultdict(lambda: ([], [])))
    for (_, h), p in pairs.items():
        for t, m, b in zip(p.dates, p.model, p.baseline, strict=True):
            ms, bs = acc[h][t]
            ms.append(m.pinball)
            bs.append(b.pinball)
    out: dict[int, tuple[list[datetime], np.ndarray]] = {}
    for h, by_t in acc.items():
        ordered = sorted(by_t)
        dates = ordered[: len(ordered) - skip][-POOLED_WEEKS:]
        d = np.asarray([weekly_skill(np.asarray(by_t[t][0]), np.asarray(by_t[t][1])) for t in dates], dtype=np.float64)
        out[h] = (dates, d)
    return out


def pooled_gate(
    pairs: Mapping[tuple[str, int], Paired], horizons: Sequence[int], alpha: float = ALPHA, skip: int = 0
) -> dict[int, PooledResult]:
    by_h = weekly_d(pairs, skip)
    empty = np.empty(0, dtype=np.float64)
    return pooled_verdicts({h: by_h[h][1] if h in by_h else empty for h in horizons}, alpha)


def window_dates(pairs: Mapping[tuple[str, int], Paired], h: int, skip: int = 0) -> tuple[datetime, datetime] | None:
    """`pooled_gate(skip=…)` 가 본 기간 h 의 첫 주 · 마지막 주 — 리포트에 창을 적으려고."""
    by_h = weekly_d(pairs, skip)
    dates = by_h[h][0] if h in by_h else []
    return (dates[0], dates[-1]) if dates else None


def kr_cards(
    pairs: Mapping[tuple[str, int], Paired],
    model: str,
    baseline: str,
    horizons: Sequence[int],
    alpha: float = ALPHA,
) -> tuple[int, dict[int, PooledResult]]:
    """풀링 게이트 + 종목 거부권으로 켜지는 카드 수. 신선도는 백테스트라 빼고 센다."""
    verdicts = pooled_gate(pairs, horizons, alpha)
    rows = gates_from_pairs(pairs, model, baseline, set(), {h: r.passed for h, r in verdicts.items()})
    return sum(1 for g in rows if g.result.renderable), verdicts


def pooled_gates(
    scores: Iterable[ScoreRow],
    model: str,
    baseline: str,
    universe: Sequence[tuple[str, int]],
    stale: set[str],
    on_grid: Callable[[int], bool],
    horizons: Sequence[int],
) -> list[GateRow]:
    """게이트 행 — 풀링 검정 → 종목 거부권. 국내 백테스트 · 매일 작업이 같이 쓴다."""
    pairs = paired_scores(scores, model, baseline, universe, on_grid)
    verdicts = pooled_gate(pairs, horizons)
    return gates_from_pairs(pairs, model, baseline, stale, {h: r.passed for h, r in verdicts.items()})


def with_status(rows: Iterable[GateRow], status: Mapping[str, StatusReason]) -> list[GateRow]:
    """종목 상태가 있으면 두 열 모두 그 상태로 끈다(FC-REQ-020 FR-9) — 표본 · 신선도 · 실력 사유보다 먼저 보인다.

    지표(커버리지 · 폭 · 빗나간 수)는 그대로 둔다 — 성적은 상태와 무관하게 채점된 값이다.
    """
    out: list[GateRow] = []
    for g in rows:
        reason = status.get(g.symbol)
        if reason is None:
            out.append(g)
            continue
        result = replace(
            g.result, renderable=False, blocked_reason=reason, range_renderable=False, range_blocked_reason=reason
        )
        out.append(replace(g, result=result))
    return out


def per_symbol_cards(pairs: Mapping[tuple[str, int], Paired], model: str, baseline: str) -> int:
    """지금의 종목별 게이트(코인)로 켜지는 카드 수."""
    return sum(1 for g in gates_from_pairs(pairs, model, baseline, set(), display_ci=False) if g.result.renderable)


def _flipped(pairs: Mapping[tuple[str, int], Paired], flip: Mapping[datetime, bool]) -> dict[tuple[str, int], Paired]:
    out: dict[tuple[str, int], Paired] = {}
    for key, p in pairs.items():
        m: list[Score] = []
        b: list[Score] = []
        for t, ms, bs in zip(p.dates, p.model, p.baseline, strict=True):
            swap = flip.get(t, False)
            m.append(bs if swap else ms)
            b.append(ms if swap else bs)
        out[key] = replace(p, model=m, baseline=b)
    return out


@dataclass(frozen=True, slots=True)
class PlaceboResult:
    observed: int
    null_mean: float
    null_q95: float
    p_value: float  # 귀무에서 관측 이상이 나온 비율(+1 보정)
    reps: int

    @property
    def false_discovery(self) -> float | None:
        """켜진 카드 중 우연 기대 비율. 관측 0 이면 정의되지 않는다."""
        return min(1.0, self.null_mean / self.observed) if self.observed else None


def placebo(
    pairs: Mapping[tuple[str, int], Paired],
    count: Callable[[Mapping[tuple[str, int], Paired]], int],
    reps: int = PLACEBO_REPS,
    seed: int = PLACEBO_SEED,
    block: int = BLOCK_WEEKS,
) -> PlaceboResult:
    """게이트 전체(`count`)를 날짜 블록 맞바꾸기로 다시 돌린다. 판정 창 밖의 오래된 주도 같이 뒤집힌다 — 무해하다."""
    dates = sorted({t for p in pairs.values() for t in p.dates})
    rng = np.random.default_rng(seed)
    observed = count(pairs)
    null = np.empty(reps, dtype=np.float64)
    for i in range(reps):
        flips = block_flips(len(dates), block, rng)
        null[i] = count(_flipped(pairs, dict(zip(dates, flips.tolist(), strict=True))))
    return PlaceboResult(
        observed,
        float(null.mean()),
        float(np.quantile(null, 0.95)),
        float((1 + np.sum(null >= observed)) / (reps + 1)),
        reps,
    )


class _FlipFrame:
    """국내 풀링 게이트 + 종목 거부권(`kr_cards`)의 켜진 카드 수를 맞바꾸기 마스크로 다시 세는 배열판(FC-REQ-020 P4).

    `kr_cards(_flipped(pairs, flip))` 와 **같은 수**를 낸다(tests/scoring/test_pooled_gate.py). 플라시보 200회마다
    종목 × 기간 수천 칸의 점수 객체를 다시 만들던 것을, 한 번 평탄 배열로 옮겨 두고 `np.where` 로 맞바꾼다.

    같은 수를 내려고 지키는 것:
    - 주별 단면 d̄_t 는 원래와 **같은 순서**(짝 순서 → 날짜)로 모은 조각에 `mean` 을 부른다 — 합산 순서가 같다
    - 종목 거부권은 렌더 조건만: 최근 GATE_WINDOW 표본 ≥ MIN_GATE_SAMPLE · 커버리지 범위 · 폭 < 기준 폭 · 풀링 통과.
      신선도는 백테스트라 없다. 실력 하한(`skill_ci_low`)은 국내 판정에 쓰지 않는다(표시용)
    - 폭 중앙값은 `np.median` 과 같은 값(정렬 뒤 가운데 하나 또는 둘의 평균)
    """

    def __init__(self, pairs: Mapping[tuple[str, int], Paired]) -> None:
        self.dates = sorted({t for p in pairs.values() for t in p.dates})
        pos = {t: i for i, t in enumerate(self.dates)}
        hs: list[int] = []
        di: list[int] = []
        cols: tuple[list[float], ...] = ([], [], [], [], [], [])  # 모델 · 기준 × pinball · hit90 · width90
        windows: list[list[int]] = []
        key_h: list[int] = []
        for (_, h), p in pairs.items():
            start = len(hs)
            for t, m, b in zip(p.dates, p.model, p.baseline, strict=True):
                hs.append(h)
                di.append(pos[t])
                for col, v in zip(cols, (m.pinball, b.pinball, m.hit90, b.hit90, m.width90, b.width90), strict=True):
                    col.append(float(v))
            n = min(len(p.dates), GATE_WINDOW)
            if n >= MIN_GATE_SAMPLE:  # 표본이 모자란 칸은 어떤 맞바꾸기에도 켜지지 않는다
                windows.append(list(range(start + len(p.dates) - n, start + len(p.dates))))
                key_h.append(h)
        self.di = np.asarray(di, dtype=np.int64)
        mp, bp, mh, bh, mw, bw = (np.asarray(c, dtype=np.float64) for c in cols)
        # 주별 단면 — (기간, 날짜) 묶음이 붙도록 안정 정렬. 묶음 안은 원래 순서 그대로
        h_arr = np.asarray(hs, dtype=np.int64)
        order = np.lexsort((np.arange(len(hs)), self.di, h_arr))
        self.w_di, self.w_mp, self.w_bp = self.di[order], mp[order], bp[order]
        sh, sd = h_arr[order], self.w_di
        cuts = [0, *(np.flatnonzero((sh[1:] != sh[:-1]) | (sd[1:] != sd[:-1])) + 1).tolist(), len(sh)]
        groups: dict[int, list[tuple[int, int]]] = defaultdict(list)
        for a, b in pairwise(cuts):
            if b > a:
                groups[int(sh[a])].append((a, b))
        # weekly_d 처럼 날짜 오름차순 마지막 POOLED_WEEKS 주만
        self.groups = {h: g[-POOLED_WEEKS:] for h, g in groups.items()}
        # 종목 거부권 — 창 인덱스를 (칸 × GATE_WINDOW) 로. 빈자리는 마지막 칸(번호 len)을 가리킨다
        self.key_h = np.asarray(key_h, dtype=np.int64)
        self.n = np.asarray([len(w) for w in windows], dtype=np.int64)
        pad = len(hs)
        self.win = np.full((len(windows), GATE_WINDOW), pad, dtype=np.int64)
        for i, w in enumerate(windows):
            self.win[i, : len(w)] = w
        self.mh, self.bh, self.mw, self.bw = mh, bh, mw, bw

    def count(self, flip: NDArray[np.bool_], horizons: Sequence[int], alpha: float) -> int:
        """flip[i] = 날짜 i 에서 모델 · 기준을 맞바꾼다."""
        swap_w = flip[self.w_di]
        mp = np.where(swap_w, self.w_bp, self.w_mp)
        bp = np.where(swap_w, self.w_mp, self.w_bp)
        d_by_h = {
            h: np.asarray([weekly_skill(mp[a:b], bp[a:b]) for a, b in self.groups[h]], dtype=np.float64)
            if h in self.groups
            else np.empty(0, dtype=np.float64)
            for h in horizons
        }
        verdicts = pooled_verdicts(d_by_h, alpha)
        if not self.n.size:
            return 0
        swap = flip[self.di]
        hit = np.append(np.where(swap, self.bh, self.mh), 0.0)[self.win]
        mw = np.append(np.where(swap, self.bw, self.mw), np.inf)[self.win]
        bw = np.append(np.where(swap, self.mw, self.bw), np.inf)[self.win]
        coverage = hit.sum(axis=1) / self.n
        ok = (coverage >= COVERAGE90_MIN) & (coverage <= COVERAGE90_MAX)
        ok &= _row_median(mw, self.n) < _row_median(bw, self.n)
        ok &= np.asarray([verdicts[int(h)].passed if int(h) in verdicts else False for h in self.key_h], dtype=bool)
        return int(ok.sum())


def _row_median(x: NDArray[np.float64], n: NDArray[np.int64]) -> NDArray[np.float64]:
    """행마다 앞 n 개(뒤는 +inf 채움)의 중앙값 — `np.median` 과 같은 값."""
    s = np.sort(x, axis=1)
    rows: NDArray[np.int64] = np.arange(s.shape[0], dtype=np.int64)
    lo = s[rows, (n - 1) // 2]
    hi = s[rows, n // 2]
    return np.where(n % 2 == 1, lo, (lo + hi) / 2.0)


def kr_placebo(
    pairs: Mapping[tuple[str, int], Paired],
    horizons: Sequence[int],
    alpha: float = ALPHA,
    reps: int = PLACEBO_REPS,
    seed: int = PLACEBO_SEED,
    block: int = BLOCK_WEEKS,
) -> PlaceboResult:
    """`placebo(pairs, kr_cards 의 수)` 와 같은 결과 — 같은 난수 순서 · 같은 셈을 배열로."""
    frame = _FlipFrame(pairs)
    rng = np.random.default_rng(seed)
    observed = frame.count(np.zeros(len(frame.dates), dtype=bool), horizons, alpha)
    null = np.empty(reps, dtype=np.float64)
    for i in range(reps):
        null[i] = frame.count(block_flips(len(frame.dates), block, rng), horizons, alpha)
    return PlaceboResult(
        observed,
        float(null.mean()),
        float(np.quantile(null, 0.95)),
        float((1 + np.sum(null >= observed)) / (reps + 1)),
        reps,
    )


def trim(
    pairs: Mapping[tuple[str, int], Paired], weeks: int = max(GATE_WINDOW, POOLED_WEEKS)
) -> dict[tuple[str, int], Paired]:
    """플라시보 속도 — 어떤 판정도 보지 않는 오래된 주를 미리 잘라 둔다."""
    return {
        k: replace(p, dates=p.dates[-weeks:], model=p.model[-weeks:], baseline=p.baseline[-weeks:])
        for k, p in pairs.items()
    }


def render_pooled(title: str, verdicts: Mapping[int, PooledResult], alpha: float = ALPHA) -> list[str]:
    lines = [
        f"## {title}",
        "",
        f"d̄_t = 1 − 주별 단면 평균(모델 pinball) ÷ 평균(기준 pinball). 기간 4개 한 가족 Holm(α {alpha:g}). "
        "통과 = HLN-DM(Holm) · 블록 부트스트랩 하한 > 0 · 비중첩(Holm) 셋 다",
        "",
        "| 기간 | 주 | 평균 d̄ | HLN-DM t · p | 블록 | 부트스트랩 95% | 비중첩 최소 평균 · p 중앙값 | 일치 | 통과 |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for h, r in sorted(verdicts.items()):
        lines.append(
            f"| {h}주 | {r.weeks} | {r.mean_skill:+.2%} | {r.dm_stat:.2f} · {r.dm_p:.3f}{' ✓' if r.dm_holm else ''} | "
            f"{r.block} | [{r.boot_low:+.2%}, {r.boot_high:+.2%}] | {r.nonoverlap_min_mean:+.2%} · "
            f"{r.nonoverlap_p:.3f}{' ✓' if r.nonoverlap_holm else ''} | {'예' if r.agrees else '**아니오**'} | "
            f"{'**통과**' if r.passed else '아니오'} |"
        )
    return [*lines, ""]


def render_placebo(title: str, r: PlaceboResult, threshold: float | None = FALSE_DISCOVERY_MAX) -> list[str]:
    fd = r.false_discovery
    verdict = ""
    if threshold is not None:
        verdict = (
            " — 관측 0 (켜진 카드 없음)"
            if fd is None
            else (f" — 기준 {threshold:.0%} {'이하 ✓' if fd <= threshold else '**초과**'}")
        )
    return [
        f"## {title}",
        "",
        f"날짜 {BLOCK_WEEKS}주 블록 맞바꾸기 {r.reps}회(모든 종목 · 기간 공통).",
        "",
        f"- 관측 켜진 카드 **{r.observed}** · 귀무 평균 {r.null_mean:.1f} · 귀무 95% {r.null_q95:.0f}"
        f" · p {r.p_value:.3f}",
        f"- 거짓 발견 비율(귀무 평균 ÷ 관측) **{'—' if fd is None else f'{fd:.0%}'}**{verdict}",
        "",
    ]

"""풀링 게이트 · 종목 거부권 · 플라시보 · 꼬리 커버리지(FC-REQ-020 FR-1 · FR-2 · FR-4 · FR-5)."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime, timedelta

import numpy as np

from salt_forecast.domain.quantiles import Z_SCORES, QuantileForecast
from salt_forecast.domain.scoring import Score, evaluate_gate, score
from salt_forecast.scoring.coverage import TailObs, nonoverlapping, render_regime_coverage, tail_rate
from salt_forecast.scoring.evaluate import Paired, gates_from_pairs
from salt_forecast.scoring.pooled_gate import kr_cards, kr_placebo, per_symbol_cards, placebo, with_status

T0 = datetime(2024, 1, 1, tzinfo=UTC)


def _score(width: float, realized: float) -> Score:
    return score(QuantileForecast.from_array(Z_SCORES * width, 0.5), "abstain", realized)


def _pairs(n_sym: int, weeks: int, model_width: float, seed: int) -> dict[tuple[str, int], Paired]:
    rng = np.random.default_rng(seed)
    dates = [T0 + timedelta(weeks=i) for i in range(weeks)]
    out: dict[tuple[str, int], Paired] = {}
    for i in range(n_sym):
        r = rng.normal(0.0, 0.05, weeks).tolist()
        out[(f"S{i}", 1)] = Paired("backtest", dates, [_score(model_width, x) for x in r], [_score(0.08, x) for x in r])
    return out


def test_veto_only_ignores_symbol_iid_skill() -> None:
    """종목 하나의 iid 하한이 음수여도 풀링이 통과하면 켜진다 · 풀링이 지면 이겨도 꺼진다."""
    # 실현값 = 표준정규 분위 52개 × 0.05 — 90% 구간 밖이 4개(커버리지 92%)라 보정 검사는 통과한다
    z = np.sort(np.random.default_rng(5).normal(size=52))
    z[:2], z[-2:] = (-2.5, -2.2), (2.2, 2.5)
    z[2:-2] = np.clip(z[2:-2], -1.5, 1.5)
    m = [_score(0.05, 0.05 * x) for x in z]
    b = [_score(0.05, 0.05 * x) for x in z]  # 같다 → 실력 0
    assert evaluate_gate(m, b, stale=False).blocked_reason == "underperforms_baseline"
    assert evaluate_gate(m, b, stale=False, pooled_skill=True).blocked_reason == "not_sharper_than_baseline"
    narrower = [_score(0.045, s.realized) for s in m]
    assert evaluate_gate(narrower, b, stale=False, pooled_skill=True).renderable
    assert evaluate_gate(narrower, b, stale=False, pooled_skill=False).blocked_reason == "skill_not_significant"


def test_pooled_veto_turns_off_range_card_too() -> None:
    """국내는 거부권 · 풀링 검정이 범위 카드도 끈다(FC-REQ-020 FR-1 · FR-2).

    코인 경로(pooled_skill=None)는 범위가 보정만 본다.
    """
    z = np.sort(np.random.default_rng(5).normal(size=52))
    z[:2], z[-2:] = (-2.5, -2.2), (2.2, 2.5)
    z[2:-2] = np.clip(z[2:-2], -1.5, 1.5)
    m = [_score(0.05, 0.05 * x) for x in z]
    b = [_score(0.05, 0.05 * x) for x in z]
    wide = evaluate_gate(m, b, stale=False, pooled_skill=True)
    assert (wide.range_renderable, wide.range_blocked_reason) == (False, "not_sharper_than_baseline")
    narrower = [_score(0.045, s.realized) for s in m]
    lost = evaluate_gate(narrower, b, stale=False, pooled_skill=False)
    assert (lost.range_renderable, lost.range_blocked_reason) == (False, "skill_not_significant")
    assert evaluate_gate(narrower, b, stale=False, pooled_skill=True).range_renderable
    coin = evaluate_gate(m, b, stale=False)
    assert coin.range_renderable and coin.blocked_reason == "underperforms_baseline"


def test_pooled_gate_turns_on_real_skill_and_placebo_is_low() -> None:
    """실제 σ 0.05 · 모델 0.05 vs 기준 0.08 — 진짜로 더 잘 맞는다. 풀링이 통과하고 우연 비율이 낮다."""
    pairs = _pairs(20, 60, 0.05, seed=1)
    n, verdicts = kr_cards(pairs, "m", "b", (1,))
    assert verdicts[1].passed and n > 0
    r = placebo(pairs, lambda p: kr_cards(p, "m", "b", (1,))[0], reps=30)
    assert r.observed == n
    assert r.false_discovery is not None and r.false_discovery < 0.5


def test_placebo_is_reproducible() -> None:
    pairs = _pairs(10, 40, 0.06, seed=2)

    def count(p: Mapping[tuple[str, int], Paired]) -> int:
        return per_symbol_cards(p, "m", "b")

    assert placebo(pairs, count, reps=10) == placebo(pairs, count, reps=10)


def test_tail_rate_cluster_se_counts_dates_not_rows() -> None:
    """같은 주 종목이 함께 빠지면 SE 가 커진다 — 행을 독립으로 세지 않는다."""
    together = [TailObs(f"S{i}", 1, d, -0.1, 0.1, 0.2 if d % 10 == 0 else 0.0) for d in range(50) for i in range(10)]
    spread = [
        TailObs(f"S{i}", 1, d, -0.1, 0.1, 0.2 if (d + i) % 10 == 0 else 0.0) for d in range(50) for i in range(10)
    ]
    a = tail_rate(together, [o.upper for o in together])
    b = tail_rate(spread, [o.upper for o in spread])
    assert a.rate == b.rate == 0.1
    assert a.cluster_se > 3 * b.cluster_se


def test_nonoverlapping_keeps_every_hth_week() -> None:
    obs = [TailObs("S", 3, d, -1, 1, 0) for d in range(10)]
    assert [o.as_of for o in nonoverlapping(obs, 3)] == [0, 3, 6, 9]


def _mixed_pairs(seed: int) -> dict[tuple[str, int], Paired]:
    """기간 4개 · 길이 제각각(표본 부족 포함) · 날짜 구멍 · 실력 있는 칸과 없는 칸 · 커버리지 경계 근처."""
    rng = np.random.default_rng(seed)
    out: dict[tuple[str, int], Paired] = {}
    for i in range(40):
        for h in (1, 2, 3, 4):
            weeks = int(rng.integers(10, 130))
            start = int(rng.integers(0, 30))
            idx = sorted(rng.choice(np.arange(start, start + weeks + 20), size=weeks, replace=False).tolist())
            dates = [T0 + timedelta(weeks=k) for k in idx]
            r = rng.normal(0.0, 0.05 * np.sqrt(h), weeks).tolist()
            mw = float(rng.choice([0.05, 0.06, 0.07, 0.08, 0.09]))
            out[(f"S{i}", h)] = Paired(
                "backtest", dates, [_score(mw * np.sqrt(h), x) for x in r], [_score(0.08 * np.sqrt(h), x) for x in r]
            )
    return out


def test_kr_placebo_matches_object_placebo() -> None:
    """배열판 플라시보가 객체판(`placebo` + `kr_cards`)과 관측 · 귀무 분포까지 같다(FC-REQ-020 P4)."""
    for seed, alpha in ((1, 0.05), (2, 0.0125), (3, 0.05)):
        pairs = _mixed_pairs(seed)

        def count(p: Mapping[tuple[str, int], Paired], a: float = alpha) -> int:
            return kr_cards(p, "m", "b", (1, 2, 3, 4), a)[0]

        slow = placebo(pairs, count, reps=25)
        fast = kr_placebo(pairs, (1, 2, 3, 4), alpha, reps=25)
        assert fast == slow
    assert slow.observed > 0  # 켜진 카드가 있는 경우도 본다


def test_lazy_ci_keeps_per_symbol_renderable() -> None:
    """표시용 하한을 건너뛰어도(`display_ci=False`) 옛 종목별 게이트의 켜짐은 같다(FC-REQ-020 P4)."""
    for seed in (4, 5):
        pairs = _mixed_pairs(seed)
        full = gates_from_pairs(pairs, "m", "b", set())
        lazy = gates_from_pairs(pairs, "m", "b", set(), display_ci=False)
        assert [g.result.renderable for g in full] == [g.result.renderable for g in lazy]
        assert [g.result.blocked_reason for g in full] == [g.result.blocked_reason for g in lazy]
        assert any(g.result.renderable for g in full)


def test_status_turns_off_both_columns_keeps_metrics() -> None:
    """상태가 있는 종목은 방향 · 범위 둘 다 상태 사유로 꺼지고, 성적 지표는 남는다(FC-REQ-020 FR-9)."""
    pairs = _pairs(2, 52, 0.06, seed=3)
    rows = gates_from_pairs(pairs, "m", "b", set(), {1: True})
    out = with_status(rows, {"S0": "trading_halted"})
    s0 = next(g for g in out if g.symbol == "S0")
    s1 = next(g for g in out if g.symbol == "S1")
    assert (s0.result.renderable, s0.result.blocked_reason) == (False, "trading_halted")
    assert (s0.result.range_renderable, s0.result.range_blocked_reason) == (False, "trading_halted")
    before = next(g for g in rows if g.symbol == "S0")
    assert (s0.result.coverage90, s0.result.width90, s0.result.miss_count) == (
        before.result.coverage90,
        before.result.width90,
        before.result.miss_count,
    )
    assert s1 == next(g for g in rows if g.symbol == "S1")


def test_regime_coverage_splits_the_same_nonoverlapping_weeks() -> None:
    # 주 0~9, h=2 → 0 · 2 · 4 · 6 · 8. 국면 = 주 < 5 이면 A. A 는 위 꼬리만, B 는 이탈 없음
    obs = [TailObs(f"S{i}", 2, d, -0.1, 0.1, 0.2 if d < 5 else 0.0) for d in range(10) for i in range(2)]
    lines = render_regime_coverage("t", ["m"], lambda _m: obs, [2], lambda t: "A" if t < 5 else "B", ["A", "B", "C"])
    rows = [ln for ln in lines if ln.startswith("| `m`")]
    assert rows[0].startswith("| `m` | 2주 | A | 6(3) | 100.0%")
    assert rows[1].startswith("| `m` | 2주 | B | 4(2) | 0.0%")
    assert rows[2] == "| `m` | 2주 | C | 0 | — | — | — |"

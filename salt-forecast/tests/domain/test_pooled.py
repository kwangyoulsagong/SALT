"""풀링 실력 검정 · 위치 0 형태(FC-REQ-020 FR-1 · FR-3 · FR-6)."""

from __future__ import annotations

import numpy as np

from salt_forecast.domain.baselines import empirical_shape_zero
from salt_forecast.domain.pooled import (
    block_flips,
    chi2_1_sf,
    hln_dm,
    holm,
    nonoverlap,
    politis_white,
    pooled_verdicts,
    t_sf,
)
from salt_forecast.domain.quantiles import LEVELS
from salt_forecast.domain.series import DAY, CloseSeries


def test_tail_functions_match_tables() -> None:
    assert abs(t_sf(2.0, 10) - 0.036694) < 1e-5
    assert abs(t_sf(-2.0, 10) - (1 - 0.036694)) < 1e-5
    assert abs(t_sf(1.0, 1) - 0.25) < 1e-9  # 코시
    assert abs(chi2_1_sf(3.841459) - 0.05) < 1e-6


def test_holm_steps_down_and_stops() -> None:
    assert holm([0.01, 0.04, 0.03, 0.2]) == [True, False, False, False]  # 0.03 > 0.05/3 에서 멈춘다
    assert holm([0.001, 0.01, 0.02, 0.04]) == [True, True, True, True]


def test_overlap_widens_dm_variance() -> None:
    """같은 평균이라도 이웃이 겹친(이동 평균) 계열은 HLN-DM 이 덜 유의하다 — 겹침을 iid 로 세지 않는다."""
    rng = np.random.default_rng(1)
    e = rng.normal(0.0, 1.0, 400)
    iid = 0.12 + e[:200]
    overlapped = 0.12 + np.convolve(e, np.ones(4) / 2.0, mode="valid")[:200]
    assert hln_dm(overlapped, 4)[1] > hln_dm(iid, 1)[1]


def test_politis_white_grows_with_persistence() -> None:
    rng = np.random.default_rng(2)
    white = rng.normal(size=300)
    ar = np.zeros(300)
    for i in range(1, 300):
        ar[i] = 0.8 * ar[i - 1] + rng.normal()
    assert politis_white(ar) > politis_white(white)


def test_nonoverlap_uses_each_offset() -> None:
    d = np.asarray([1.0, -1.0] * 30)  # 오프셋 0 은 +1, 오프셋 1 은 −1
    min_mean, _ = nonoverlap(d, 2)
    assert min_mean == -1.0


def test_pooled_needs_all_three_and_short_series_fail() -> None:
    rng = np.random.default_rng(3)
    strong = 0.02 + rng.normal(0.0, 0.01, 80)
    null = rng.normal(0.0, 0.01, 80)
    out = pooled_verdicts({1: strong, 2: null, 3: strong[:20]})
    assert out[1].passed and out[1].agrees
    assert not out[2].passed
    assert not out[3].passed and out[3].weeks == 20  # MIN_WEEKS 미만


def test_block_flips_are_constant_within_block() -> None:
    f = block_flips(30, 8, np.random.default_rng(0))
    assert f.size == 30
    for k in range(0, 30, 8):
        assert len(set(f[k : k + 8].tolist())) == 1


def test_shape_zero_has_zero_median_even_after_rally() -> None:
    """2년 내내 오른 종목도 중앙값 0 · 상승 확률 0.5 — 과거 상승을 다음 기간 드리프트로 옮기지 않는다."""
    rng = np.random.default_rng(4)
    n = 600
    t = np.arange(n, dtype=np.int64) * DAY
    close = 100 * np.exp(np.cumsum(0.003 + rng.normal(0.0, 0.02, n)))
    raw = empirical_shape_zero(CloseSeries("X", t, close), 2, 5, None)
    assert raw is not None
    assert raw.forecast.at(0.5) == 0.0 or abs(raw.forecast.at(0.5)) < 1e-12
    assert raw.forecast.p_up == 0.5
    assert raw.forecast.at(LEVELS[-1]) > 0 > raw.forecast.at(LEVELS[0])

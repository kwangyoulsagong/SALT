"""search-interest@1 채점 부품 — 시점 · BY 보정 · 부트스트랩 방향(FC-REQ-017)."""

from __future__ import annotations

from datetime import UTC, date, datetime

import numpy as np

from salt_forecast.domain.search_interest import last_known_day
from salt_forecast.scoring.search_interest import by_reject, mean_test, ts_test


def test_monday_signal_sees_up_to_saturday_kst() -> None:
    # 월요일 00:00 UTC = 월 09:00 KST. 일요일(KST) 하루치는 화요일 00:00 KST(월 15:00 UTC)에야 알 수 있다
    assert last_known_day(datetime(2026, 10, 5, tzinfo=UTC)) == date(2026, 10, 3)


def test_by_reject_is_stricter_than_bh() -> None:
    # m=2, c=1.5: 1등 문턱 0.1·1/3 ≈ 0.033, 2등 0.1·2/3 ≈ 0.067
    assert by_reject([0.03, 0.06]) == [True, True]
    assert by_reject([0.04, 0.06]) == [True, True]  # step-up — 2등이 문턱 안이면 1등도 기각
    assert by_reject([0.04, 0.07]) == [False, False]
    assert by_reject([0.01, 0.5]) == [True, False]


def test_ts_test_finds_planted_relation_and_not_noise() -> None:
    rng = np.random.default_rng(1)
    x = rng.normal(size=300)
    strong = ts_test("s", x, x + rng.normal(scale=0.5, size=300))
    noise = ts_test("n", x, np.random.default_rng(7).normal(size=300))
    assert strong.ci_low > 0 and strong.p < 0.01
    assert noise.ci_low < 0 < noise.ci_high


def test_mean_test_one_sided_negative() -> None:
    rng = np.random.default_rng(2)
    neg = mean_test("m", rng.normal(-0.1, 0.2, size=200), np.full(200, 8.0))
    pos = mean_test("m", rng.normal(0.1, 0.2, size=200), np.full(200, 8.0))
    assert neg.p < 0.01 and pos.p > 0.99
    assert neg.mean_obs == 8.0

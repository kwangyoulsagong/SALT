"""H1 vol-range@1 — 목표 · 피처 · 적합 · 컨포멀 · 검정 · 판정 경계."""

from __future__ import annotations

import math
from datetime import date

import numpy as np

from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.domain.vol_range import (
    CONF_DATES,
    EMBARGO,
    CellResult,
    DmTest,
    ForwardResult,
    ForwardRow,
    VolPanel,
    _roll_mean,  # pyright: ignore[reportPrivateUsage]
    block_shuffle,
    conformal_q,
    coverage_ok,
    crypto_daily_rv,
    data_short,
    dm_test,
    forward_judge,
    forward_result,
    forward_sum,
    garman_klass,
    holm_family,
    judge_history,
    look_due,
    prepare,
    qlike,
    walk_forward,
)

T0 = 1_735_689_600  # 2025-01-01 00:00 UTC (= 09:00 KST)


def _hours(close: np.ndarray, start: int = T0) -> OhlcvSeries:
    t = (start + 3600 * np.arange(1, close.size + 1)).astype(np.int64)
    return OhlcvSeries("KRW-X", t, close, close, close, close, np.ones(close.size))


def test_crypto_day_is_kst_0900_and_needs_22_bars() -> None:
    close = np.exp(np.cumsum(np.full(48, 0.01)))
    p = crypto_daily_rv({"KRW-X": _hours(close)}, T0, T0 + 2 * DAY)
    # 첫날: 봉 24개, 수익 23개(첫 봉 앞이 없다) — 둘째 날: 24개(앞날 마지막 봉과 이어진다)
    row = {int(d): i for i, d in enumerate(p.dates)}
    d1, d2 = row[T0 + DAY], row[T0 + 2 * DAY]
    assert math.isclose(p.rv[d1, 0], 23 * 0.01**2)
    assert math.isclose(p.rv[d2, 0], 24 * 0.01**2)
    assert math.isclose(p.ret[d2, 0], 24 * 0.01)
    short = crypto_daily_rv({"KRW-X": _hours(close[:21])}, T0, T0 + DAY)
    assert np.isnan(short.rv[-1, 0])


def test_crypto_return_skips_gap_hour() -> None:
    close = np.exp(np.cumsum(np.full(24, 0.01)))
    t = _hours(close).available_at
    c = np.delete(close, 5)
    gap = OhlcvSeries("KRW-X", np.delete(t, 5), c, c, c, c, np.ones(23))
    p = crypto_daily_rv({"KRW-X": gap}, T0, T0 + DAY)
    assert math.isclose(p.rv[-1, 0], 21 * 0.01**2)  # 빠진 시간 양옆 수익은 세지 않는다


def test_garman_klass_value_and_negative_dropped() -> None:
    o = np.array([[100.0], [101.0]])
    h = np.array([[102.0], [101.0]])
    lo = np.array([[99.0], [101.0]])
    c = np.array([[101.0], [101.0]])
    gk, neg = garman_klass(o, h, lo, c)
    assert np.isnan(gk[0, 0])  # 전날 종가가 없다
    assert math.isclose(gk[1, 0], 0.0)
    assert neg == 0
    gk2, neg2 = garman_klass(np.array([[1.0], [1.0]]), np.array([[1.0], [1.001]]), np.array([[1.0], [1.0]]),
                             np.array([[1.0], [1.001]]))  # fmt: skip
    assert neg2 == 0 and gk2[1, 0] >= 0
    gk3, neg3 = garman_klass(np.array([[1.0], [1.0]]), np.array([[1.0], [1.01]]), np.array([[1.0], [1.0]]),
                             np.array([[1.0], [1.01]]))  # fmt: skip
    # 0.5 hl² − 0.386 co² 에서 hl = co 면 양수 — 음수 칸은 종가 · 고가 모순일 때만. 건수 세기만 본다
    assert neg3 == int(np.sum(np.isfinite(gk3) & (gk3 < 0)))


def test_roll_mean_min_present() -> None:
    m = np.array([[1.0], [np.nan], [3.0], [5.0], [7.0]])
    strict = _roll_mean(m, 5)
    loose = _roll_mean(m, 5, 0.8)
    assert np.isnan(strict[4, 0])
    assert math.isclose(loose[4, 0], 4.0)  # 있는 넷의 평균
    assert np.isnan(_roll_mean(np.array([[1.0], [np.nan], [np.nan], [5.0], [7.0]]), 5, 0.8)[4, 0])


def test_forward_sum_is_next_h() -> None:
    rv = np.arange(1.0, 8.0)[:, None]
    f = forward_sum(rv, 2)
    assert f[0, 0] == 2 + 3 and f[4, 0] == 6 + 7
    assert np.isnan(f[5:, 0]).all()


def test_qlike_zero_at_truth_and_nan_on_nonpositive() -> None:
    assert qlike(np.array([[2.0]]), np.array([[2.0]]))[0, 0] == 0
    assert np.isnan(qlike(np.array([[0.0]]), np.array([[2.0]]))[0, 0])


def _panel(n: int = 400, k: int = 30, seed: int = 1) -> VolPanel:
    rng = np.random.default_rng(seed)
    logv = np.zeros((n, k))
    for t in range(1, n):
        logv[t] = -8 + 0.9 * (logv[t - 1] + 8) + rng.normal(0, 0.3, k)
    rv = np.exp(logv)
    ret = rng.normal(0, 1, (n, k)) * np.sqrt(rv)
    close = 100 * np.exp(np.cumsum(ret, axis=0))
    dates = (T0 + DAY * np.arange(1, n + 1)).astype(np.int64)
    return VolPanel("crypto", dates, tuple(f"S{j}" for j in range(k)), rv, ret, close, np.ones((n, k), bool))


def test_walk_forward_ignores_labels_inside_purge_and_embargo() -> None:
    """적합 f 는 행 ≤ f − h − 5 의 라벨만 — 그 뒤 목표를 바꿔도 f 의 예측은 같다."""
    p = _panel()
    prep = prepare(p)
    h = 1
    wf = walk_forward("crypto", p.dates, prep.x, prep.y[h], prep.base[h], p.eligible, h)
    f = int(np.flatnonzero(wf.fit_row >= 0)[0])
    y2 = prep.y[h].copy()
    y2[f - h - EMBARGO + 1 :] *= 7.0
    wf2 = walk_forward("crypto", p.dates, prep.x, y2, prep.base[h], p.eligible, h)
    assert np.allclose(wf.har[f], wf2.har[f], equal_nan=True)
    y3 = prep.y[h].copy()
    y3[f - h - EMBARGO] *= 7.0  # 경계 안쪽 한 행은 적합을 바꾼다
    wf3 = walk_forward("crypto", p.dates, prep.x, y3, prep.base[h], p.eligible, h)
    assert not np.allclose(wf.har[f], wf3.har[f])


def test_conformal_uses_only_closed_labels_and_250_dates() -> None:
    rng = np.random.default_rng(2)
    score = rng.uniform(0, 2, (400, 5))
    q = conformal_q(score, 5)
    assert np.isnan(q[CONF_DATES + 5 - 2]).all()
    t = CONF_DATES + 5 - 1
    assert np.isfinite(q[t]).all()
    s2 = score.copy()
    s2[t - 4 :] = 100.0  # 행 t 에서 라벨이 아직 안 닫힌 행
    assert np.allclose(conformal_q(s2, 5)[t], q[t])
    s3 = score.copy()
    s3[10] = np.nan  # 점수 없는 날은 건너뛰고 그 앞 날까지 250 날을 채운다
    assert np.isfinite(conformal_q(s3, 5)[t + 1]).all()
    assert np.isnan(conformal_q(s3, 5)[t]).all()


def test_dm_one_sided() -> None:
    a = np.full((50, 3), 1.0)
    b = np.full((50, 3), 1.5) + np.random.default_rng(3).normal(0, 0.1, (50, 3))
    d = dm_test(a, b, np.ones((50, 3), bool), 1, "b1")
    assert d.mean_d < 0 and d.p < 0.01
    assert dm_test(b, a, np.ones((50, 3), bool), 1, "b1").p > 0.99


def _cell(market: str, p: float, cover: tuple[float, float]) -> CellResult:
    c = CellResult(market, 1)
    c.dm = [DmTest(b, -0.1, -5, p, 100) for b in ("b1", "b2", "b3")]
    c.cover = {0.80: cover[0], 0.95: cover[1]}
    c.cover_by_year = {2026: {0.80: cover[0], 0.95: cover[1]}}
    return c


def test_coverage_band_edges() -> None:
    assert coverage_ok({0.80: 0.78, 0.95: 0.97}, None)
    assert not coverage_ok({0.80: 0.7799, 0.95: 0.95}, None)
    assert not coverage_ok({0.80: 0.80, 0.95: 0.95}, {2025: {0.80: 0.74, 0.95: 0.95}})
    assert coverage_ok({0.80: 0.80, 0.95: 0.95}, {2025: {0.80: 0.75, 0.95: 0.90}})


def test_judge_history_reason_order() -> None:
    ok = _cell("crypto", 1e-6, (0.8, 0.95))
    noskill = _cell("crypto", 0.5, (0.5, 0.5))
    miscal = _cell("crypto", 1e-6, (0.5, 0.95))
    cells = [ok, noskill, miscal]
    holm_family(cells, 0.05)
    judge_history(cells, {"crypto": False}, {"crypto": False})
    assert (ok.status, noskill.reason, miscal.reason) == ("forward", "no_skill", "miscalibrated")
    judge_history(cells, {"crypto": True}, {"crypto": False})
    assert ok.reason == "placebo"
    judge_history(cells, {"crypto": False}, {"crypto": True})
    assert ok.status == "history_short"


def test_data_short_against_registration_start() -> None:
    assert not data_short("crypto", 1_730_419_200)  # 2024-11-01
    assert data_short("kr", T0)  # 2025 시작 — 등록 때 2021-10


def test_block_shuffle_keeps_blocks() -> None:
    idx = block_shuffle(45, 20, 1)
    assert sorted(idx.tolist()) == list(range(45))
    starts = [i for i in range(45) if i == 0 or idx[i] != idx[i - 1] + 1]
    assert all(idx[s] % 20 == 0 for s in starts)


def test_look_due_catches_up_after_sleep() -> None:
    assert look_due(date(2027, 1, 11), 0) is None
    assert look_due(date(2027, 1, 12), 0) == 0  # 판정 날짜 당일
    assert look_due(date(2027, 1, 14), 0) == 0  # 그날 맥이 잠들어도
    assert look_due(date(2027, 1, 14), 1) is None
    assert look_due(date(2027, 3, 20), 1) == 1


def _rows(n_days: int, har: float, base: float, half: float) -> list[ForwardRow]:
    rng = np.random.default_rng(4)
    out: list[ForwardRow] = []
    for d in range(n_days):
        for s in range(5):
            rv = float(rng.lognormal(math.log(1e-3), 0.3))
            out.append(ForwardRow(f"S{s}", T0 + d * DAY, har, {"b1": base, "b2": base, "b3": base},
                                  half, half * 2, rv, float(rng.normal(0, math.sqrt(rv)))))  # fmt: skip
    return out


def test_forward_judge_pass_and_last_look_fail() -> None:
    good = forward_result("crypto", 1, _rows(40, 1e-3, 1e-2, 0.0405))
    few = forward_result("kr", 1, _rows(10, 1e-3, 1e-2, 0.04))
    out = forward_judge({"crypto:1": good, "kr:1": few}, 0)
    assert out["kr:1"] == ("forward", "look1_below_min")
    assert out["crypto:1"][0] in ("pass", "forward")
    assert forward_judge({"kr:1": few}, 2)["kr:1"] == ("fail", "below_min")
    empty = ForwardResult("kr", 5)
    assert forward_judge({"kr:5": empty}, 2)["kr:5"] == ("fail", "below_min")


def test_replay_bars_boundary_table() -> None:
    """동결 재생(@3) — 등록 뒤 · 14일 안 · 예측 없는 봉 전부(이미 쓴 봉 · 등록 전 · 상한 밖은 빼고)."""
    import numpy as np

    from salt_forecast.domain.vol_range import REPLAY_CAP_DAYS, replay_bars

    day = 86_400
    dates = np.arange(0, 40 * day, day, dtype=np.int64)  # 0 … 39일
    now = int(dates[-1]) + 3_600
    assert replay_bars(dates, set(), 30 * day, now) == list(range(30, 40))  # 등록 뒤만
    assert replay_bars(dates, {int(dates[35]), int(dates[39])}, 30 * day, now) == [30, 31, 32, 33, 34, 36, 37, 38]
    far = replay_bars(dates, set(), 0, now)
    assert far[0] == 40 - REPLAY_CAP_DAYS and far[-1] == 39  # 상한 14일
    assert replay_bars(dates, {int(d) for d in dates}, 0, now) == []  # 다 찼다 — 할 일 0


def test_look_cutoff_is_kst_midnight() -> None:
    from datetime import UTC, datetime

    from salt_forecast.domain.vol_range import look_cutoff

    assert datetime.fromtimestamp(look_cutoff(0), tz=UTC).isoformat() == "2027-01-11T15:00:00+00:00"

"""short-direction@1 누수(time-and-leakage.md §6) — as_of 뒤를 지워도 as_of 까지의 예측이 같다.

① 피처 · σ · 유니버스: 뒤 봉을 지운 패널과 행 단위로 같다(도메인 테스트) ② walk-forward: as_of 뒤에 닫히는 라벨을
NaN 으로 지운 행과 원래 행의 OOS 예측이 as_of 까지 같다 — 학습 · 보정이 아직 닫히지 않은 라벨을 읽지 않는다.
"""

from __future__ import annotations

from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.short_direction import Rows, WalkSpec, walk_forward

SPEC = WalkSpec(
    horizon=4, retrain_every=24 * 7, train_span=24 * 120, min_train=24 * 60, embargo=24, cal_span=24 * 100, boot_block=7
)


def _rows(n: int, seed: int) -> Rows:
    rng = np.random.default_rng(seed)
    t = np.arange(n, dtype=np.int64)
    x = rng.normal(size=(n, 3))
    y = (rng.random(n) < 1 / (1 + np.exp(-x[:, 0]))).astype(np.float64)
    return Rows(
        t, t * 3600, t // 24, np.zeros(n, dtype=np.intp), x, y, np.where(y > 0, 0.01, -0.01), np.full(n, 0.0015),
        np.full(n, 0.01), np.sign(x[:, 1]),
    )  # fmt: skip


def test_walk_forward_ignores_labels_closing_after_as_of() -> None:
    n = 24 * 220
    full = _rows(n, 11)
    k = 24 * 190 + 5  # as_of 격자 행
    y_cut = full.y.copy()
    y_cut[full.t + SPEC.horizon > k] = np.nan  # as_of 에 아직 안 닫힌 라벨
    cut = Rows(full.t, full.when, full.day, full.sym, full.x, y_cut, full.r, full.cost, full.sigma_h, full.persist)
    a = walk_forward(full, SPEC, n - 1)
    b = walk_forward(cut, SPEC, n - 1)
    upto = full.t <= k
    assert np.isfinite(a.p[upto]).sum() > 1000  # 빈 비교가 아니다
    np.testing.assert_array_equal(a.p[upto], b.p[upto])
    np.testing.assert_array_equal(a.base[upto], b.base[upto])


def test_replay_equals_realtime_when_future_bars_arrive() -> None:
    """동결 재생(@4)의 근거 — 그 시각 예측은 나중에 봉이 더 쌓여도(깨어나서 받은 미래) 바이트까지 같다.

    실시간(그 시각까지의 봉만 있던 DB) vs 재생(며칠 뒤 봉까지 있는 DB) — 같은 함수(crypto_panel → live_predictions)."""
    from salt_forecast.domain.panel import forward_log_return
    from salt_forecast.domain.series import OhlcvSeries
    from salt_forecast.domain.short_direction import cell_rows, crypto_cell_panel
    from salt_forecast.scoring.short_direction import LIVE_HOURS, crypto_panel, live_predictions
    from tests.domain.test_short_direction import HOUR, SPEC, hourly_panel

    p = hourly_panel(24 * 140, 40)
    fit_cp = crypto_cell_panel(p)
    day = ((p.dates - 1) // 86_400).astype(np.int64)
    wf = walk_forward(cell_rows(fit_cp, 1, forward_log_return(p, 1), 0.0015, day), SPEC, p.dates.size - 1)
    assert wf.last_fit is not None
    zq = {"low": (-1.3, -0.1, 1.1), "mid": (-1.2, 0.0, 1.2), "high": (-1.1, 0.1, 1.3)}

    assert p.open is not None
    opens = p.open

    def series(upto: int) -> dict[str, OhlcvSeries]:
        return {
            s: OhlcvSeries(
                s, p.dates[:upto].copy(), opens[:upto, j], p.high[:upto, j], p.low[:upto, j], p.close[:upto, j],
                p.volume[:upto, j],
            )
            for j, s in enumerate(p.symbols)
        }  # fmt: skip

    t_idx = 24 * 130
    t = int(p.dates[t_idx])
    as_of = datetime.fromtimestamp(t + 120, UTC)  # 실시간 회차와 같은 :02
    start = int(t - LIVE_HOURS * HOUR)
    realtime = live_predictions(crypto_panel(series(t_idx + 1), start, as_of), "crypto", "1h", 1, wf.last_fit, zq)
    replay = live_predictions(crypto_panel(series(p.dates.size), start, as_of), "crypto", "1h", 1, wf.last_fit, zq)
    assert realtime and [repr(x) for x in realtime] == [repr(x) for x in replay]  # nan(p_ref 없음)까지 같은 표현
    assert all(int(x.as_of.timestamp()) == t for x in replay)

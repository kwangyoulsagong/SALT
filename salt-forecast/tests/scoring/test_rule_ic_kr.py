"""rule-ic-kr@1 — 거래일 격자 · 끊김 제외 · 대상 · 미래 행 불변(누수)."""

from __future__ import annotations

from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.scoring.rule_ic import Primary, Protocol
from salt_forecast.scoring.rule_ic_kr import label_without_breaks, run_kr, session_panel, up_breaks

KR_CLOSE = 7 * 3600  # 16:00 KST


def _weekdays(start: datetime, n: int) -> np.ndarray:
    out: list[int] = []
    t = int(start.timestamp())
    while len(out) < n:
        if datetime.fromtimestamp(t, tz=UTC).weekday() < 5:
            out.append(t + KR_CLOSE)
        t += DAY
    return np.asarray(out, dtype=np.int64)


def _series(sym: str, at: np.ndarray, close: np.ndarray, volume: float = 1e6) -> OhlcvSeries:
    v = np.full(at.size, volume)
    return OhlcvSeries(sym, at, close, close * 1.01, close * 0.99, close, v)


def test_session_panel_rows_are_trading_days_only() -> None:
    at = _weekdays(datetime(2024, 1, 1, tzinfo=UTC), 10)  # 월 ~ 다음 주 금
    p = session_panel({"005930": _series("005930", at, np.arange(10, dtype=float) + 100)}, int(at[0]), int(at[-1]))
    assert p.dates.size == 10
    assert np.array_equal(p.dates, at)
    # 1 행 뒤 = 다음 거래일(금 → 월)
    assert p.close[5, 0] == 105.0 and p.close[4, 0] == 104.0


def test_up_break_masks_label_window_only_after_t() -> None:
    at = _weekdays(datetime(2024, 1, 1, tzinfo=UTC), 6)
    close = np.array([100.0, 101.0, 102.0, 510.0, 511.0, 512.0])  # 3행에 ×5 병합
    p = session_panel({"A": _series("A", at, close)}, int(at[0]), int(at[-1]))
    b = up_breaks(p)
    assert b[:, 0].tolist() == [False, False, False, True, False, False]
    y = np.ones_like(p.close)
    masked = label_without_breaks(y, b, 1)
    # t=2 의 1일 라벨(2→3)은 끊김을 건넌다 · t=3 의 라벨(3→4)은 끊김 뒤라 쓴다
    assert np.isnan(masked[2, 0]) and masked[3, 0] == 1.0 and masked[1, 0] == 1.0


def _universe(n_sym: int, n_days: int, seed: int) -> dict[str, OhlcvSeries]:
    rng = np.random.default_rng(seed)
    at = _weekdays(datetime(2022, 1, 3, tzinfo=UTC), n_days)
    out: dict[str, OhlcvSeries] = {}
    for j in range(n_sym):
        r = rng.normal(0, 0.03, n_days)
        close = 10_000.0 * np.exp(np.cumsum(r))
        out[f"{j:06d}"] = _series(f"{j:06d}", at, close, volume=500_000.0)
    return out


PROTOCOL = Protocol((Primary("change24h", "scalp", 1),), (1,), ("fixed",), 250)


def test_universe_needs_250_bars_and_turnover() -> None:
    bars = _universe(30, 300, 1)
    out = run_kr(bars, PROTOCOL, datetime(2022, 1, 1, tzinfo=UTC), datetime(2023, 6, 1, tzinfo=UTC))
    r = next(x for x in out.results["all"] if x.primary)
    # 대상이 생기는 것은 봉 250 이후 — 날짜 수 ≤ 300 − 250 + 1 − 지평
    assert 0 < r.n_dates <= 50


def test_future_rows_do_not_change_results() -> None:
    bars = _universe(30, 320, 2)
    as_of = datetime.fromtimestamp(int(next(iter(bars.values())).available_at[300]), tz=UTC)
    base = run_kr(bars, PROTOCOL, datetime(2022, 1, 1, tzinfo=UTC), as_of)
    # as_of 뒤 봉을 크게 흔들어도(미래 오염) 결과가 같아야 한다
    poisoned = {
        s: OhlcvSeries(
            s,
            o.available_at,
            o.open,
            o.high,
            o.low,
            np.where(o.available_at > as_of.timestamp(), 1.0, o.close),
            o.volume,
        )
        for s, o in bars.items()
    }
    again = run_kr(poisoned, PROTOCOL, datetime(2022, 1, 1, tzinfo=UTC), as_of)
    assert [(x.item, x.mode) for x in base.results["all"]] == [(x.item, x.mode) for x in again.results["all"]]
    ic_a = np.array([x.ic_mean for x in base.results["all"]])
    ic_b = np.array([x.ic_mean for x in again.results["all"]])
    assert np.array_equal(ic_a, ic_b, equal_nan=True)
    assert np.isfinite(ic_a).any()

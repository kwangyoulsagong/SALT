"""등락 분해 β · 평소 변동 σ (F016 단계 C · FC-REQ-027 FR-1~3)."""

from __future__ import annotations

import numpy as np
import pytest

from salt_forecast.domain.move_beta import (
    MoveBetaWindow,
    crypto_move_beta,
    daily_sigma,
    kr_move_beta,
    kr_sector_index_code,
    regression_betas,
)
from salt_forecast.domain.series import DAY, CloseSeries

T0 = 1_700_000_000
W = MoveBetaWindow(120, 60, 60, 40)


def _series(symbol: str, rets: np.ndarray, start: int = T0, breaks: list[int] | None = None) -> CloseSeries:
    t = start + DAY * np.arange(rets.size + 1, dtype=np.int64)
    close = 100.0 * np.exp(np.concatenate([[0.0], np.cumsum(rets)]))
    return CloseSeries(symbol, t, close, np.asarray(breaks or [], dtype=np.int64))


def _factors(n: int = 200, seed: int = 7) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    rm = rng.normal(0, 0.01, n)
    rsec = rm + rng.normal(0, 0.008, n)
    noise = rng.normal(0, 0.0005, n)  # 표본 오차가 허용치(0.05) 안에 들게 — 0.002 면 β_업종 표준오차 약 0.02
    return rm, rsec, noise


def test_recovers_market_and_sector_beta() -> None:
    rm, rsec, noise = _factors()
    stock = _series("005930", 1.3 * rm + 0.6 * (rsec - rm) + noise)
    bm, bs, n = regression_betas(stock, _series("0001", rm), _series("0027", rsec), W)
    assert n == 120
    assert bm == pytest.approx(1.3, abs=0.05)
    assert bs == pytest.approx(0.6, abs=0.05)


def test_sector_history_short_falls_back_to_market_only() -> None:
    """업종 이력이 30일뿐이면 시장 한 요인 — 시장 β 까지 버리지 않는다."""
    rm, rsec, noise = _factors()
    stock = _series("005930", 1.3 * rm + noise)
    short_sector = _series("0027", rsec[-30:], start=T0 + DAY * (rm.size - 30))
    bm, bs, n = regression_betas(stock, _series("0001", rm), short_sector, W)
    assert bs is None and n == 120
    assert bm == pytest.approx(1.3, abs=0.05)


def test_too_few_common_days_is_none_not_zero() -> None:
    rm, _, noise = _factors(50)
    bm, bs, n = regression_betas(_series("A", rm + noise), _series("0001", rm), None, W)
    assert (bm, bs, n) == (None, None, 0)


def test_skips_return_across_source_break() -> None:
    """병합 ×5 끊김 봉을 건너는 하루가 β 를 끌지 않는다 — 끊김 없는 같은 계열과 β 가 같아야 한다."""
    rm, _, noise = _factors()
    rets = 1.0 * rm + noise
    jumped = rets.copy()
    jumped[150] = np.log(5.0)
    brk = T0 + DAY * 151
    clean = regression_betas(_series("A", rets), _series("0001", rm), None, W)[0]
    with_break = regression_betas(_series("A", jumped, breaks=[brk]), _series("0001", rm), None, W)[0]
    assert clean is not None and with_break is not None
    assert with_break == pytest.approx(clean, abs=0.02)


def test_sigma_is_simple_return_std_over_window() -> None:
    rng = np.random.default_rng(1)
    rets = rng.normal(0, 0.02, 300)
    sigma, n = daily_sigma(_series("A", rets), W)
    assert n == 60
    assert sigma == pytest.approx(float(np.std(np.expm1(rets[-60:]), ddof=1)))
    assert daily_sigma(_series("B", rets[:30]), W) == (None, 30)


def test_kr_move_beta_without_market_index_keeps_sigma() -> None:
    rm, _, noise = _factors()
    v = kr_move_beta(_series("A", rm + noise), None, None, W)
    assert v.beta_market is None and v.beta_sample == 0 and v.sigma_daily is not None


def test_crypto_copies_btc_beta_and_drops_nan() -> None:
    rm, _, _ = _factors()
    s = _series("KRW-ETH", rm)
    assert crypto_move_beta(s, 1.21, W).beta_market == 1.21
    assert crypto_move_beta(s, float("nan"), W).beta_market is None
    assert crypto_move_beta(s, None, W).beta_sample == 0


@pytest.mark.parametrize(
    ("big", "mid", "out"),
    [
        ("0027", None, "0027"),
        ("0000", None, None),
        ("0001", None, None),
        ("1001", None, None),
        ("2001", None, None),
        ("27", None, None),
        (None, None, None),
        ("0027", "0013", "0013"),
        ("0027", "0009", "0009"),
        ("1009", "1028", "1028"),
        ("0021", None, "0021"),
        ("0027", "0000", "0027"),
        ("0000", "0013", "0013"),
        ("0001", "0001", None),
    ],
)
def test_sector_index_code_matches_server_rule(big: str | None, mid: str | None, out: str | None) -> None:
    """서버 `krSectorIndexCodeOf` 와 같은 표(krMoveSources.test.ts) — 두 곳이 갈라지면 서버가 없는 업종 β 를 찾는다."""
    assert kr_sector_index_code(big, mid) == out


def test_window_validation() -> None:
    with pytest.raises(ValueError):
        MoveBetaWindow(120, 121, 60, 40)

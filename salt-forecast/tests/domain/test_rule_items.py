"""mode-decision@1 재현 — 서버 특성화 테스트(`market.test.ts` · `modeDecision.ts`)와 같은 값을 주장한다."""

import numpy as np

from salt_forecast.domain.panel import Panel, rolling_sum
from salt_forecast.domain.rule_items import contributions, rsi_simple, sentiment_score
from salt_forecast.domain.series import DAY


def _panel(close: list[float], high: list[float] | None = None, low: list[float] | None = None) -> Panel:
    c = np.asarray(close, dtype=np.float64)[:, None]
    h = c if high is None else np.asarray(high, dtype=np.float64)[:, None]
    lo = c if low is None else np.asarray(low, dtype=np.float64)[:, None]
    n = c.shape[0]
    return Panel(np.arange(n, dtype=np.int64) * DAY, ("KRW-X",), h, lo, c, np.ones_like(c), np.zeros(1, np.int64))


def test_rsi_matches_server_quirks() -> None:
    steady = rsi_simple(np.asarray([100.0 + i for i in range(15)])[:, None])[-1, 0]
    assert round(steady) == 93  # 하락이 없으면 (손실 || 1) — 100 이 아니다
    zigzag = rsi_simple(np.asarray([100.0 if i % 2 == 0 else 110.0 for i in range(15)])[:, None])[-1, 0]
    assert zigzag == 50.0
    assert np.isnan(rsi_simple(np.asarray([100.0 + i for i in range(14)])[:, None])[-1, 0])  # 차분 13개


def test_sentiment_neutral_and_fear_greed_zero_ignored() -> None:
    # 가격 변화 0 · 변동성 4% · 거래량 평균 → 50×0.4 + 80×0.3 + 50×0.3 = 59 (서버 특성화와 같다)
    p = _panel([100.0] * 8, high=[102.0] * 8, low=[98.0] * 8)
    assert sentiment_score(p, np.full(8, np.nan))[-1, 0] == 59.0
    assert sentiment_score(p, np.full(8, 10.0))[-1, 0] == round(59 * 0.7 + 10 * 0.3)
    assert sentiment_score(p, np.zeros(8))[-1, 0] == 59.0  # 0 은 falsy — 원문 그대로


def test_change_contribution_boundaries_are_exclusive() -> None:
    p = _panel([100.0, 102.9, 106.1, 100.0])  # +2.9% (발동 안 함) · +3.1% · −5.7%
    c = contributions(p, np.full(4, np.nan)).by_item["change24h"]
    assert np.isnan(c["scalp"][0, 0])
    assert c["scalp"][1:, 0].tolist() == [0.0, 12.0, -10.0]
    assert c["long_term"][1:, 0].tolist() == [0.0, -6.0, 6.0]


def test_whale_rule_threshold_and_missing() -> None:
    p = _panel([100.0] * 4)
    buy = np.asarray([[120.0], [121.0], [0.0], [np.nan]])
    sell = np.asarray([[100.0], [100.0], [0.0], [5.0]])
    w = contributions(p, np.full(4, np.nan), buy, sell).by_item["whale_flow"]["scalp"][:, 0]
    assert w[0] == 0.0 and w[1] == 8.0  # 1.2배 초과만
    assert w[2] == 0.0  # 둘 다 0 — 발동 안 함
    assert np.isnan(w[3])  # 재료 없음은 0 이 아니다


def test_rolling_sum_nan_window() -> None:
    m = np.asarray([[1.0], [2.0], [np.nan], [4.0], [5.0]])
    out = rolling_sum(m, 2)[:, 0]
    assert np.isnan(out[0]) and out[1] == 3.0 and np.isnan(out[2]) and np.isnan(out[3]) and out[4] == 9.0

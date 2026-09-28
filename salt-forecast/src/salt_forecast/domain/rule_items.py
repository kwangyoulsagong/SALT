"""코치 규칙 점수의 항목별 기여 — `mode-decision@1` 재현(FC-REQ-008 FR-4).

원본은 `salt-server/src/coach/domain/policy/modeDecision.ts`(점수) · `market/domain/Sentiment.ts`(심리) ·
`market/domain/Indicators.ts`(RSI)다. 백테스트는 **구현된 규칙 그대로**를 잰다 — 원문의 특이점(아래)도 옮긴다.
고치면 "지금 규칙이 맞는가"가 아니라 "고친 규칙이 맞는가"를 재게 된다. 두 벌이 갈리면 `tests/domain/test_rule_items.py`
의 표가 서버 특성화 테스트와 같은 값을 주장한다.

원문 특이점:
- RSI 는 단순 합(와일더 평활 아님)이고, 하락 합이 0 이면 **1 로 나눈다**(가격 단위가 섞인다)
- 공포탐욕 0 은 falsy 라 심리 점수에 섞이지 않는다
- 심리 거래량 평균은 오늘 봉을 포함한 7일

과거로 못 만드는 것: 단타 1시간봉 RSI(1시간 이력 없음) · 업비트 대형 체결(→ 바이낸스 덤프 대리) ·
결측 감점(백테스트 재료는 구성상 있다). 그래서 `total_score` 는 50 + 재현 가능한 항목 합이다.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.panel import Mat, Panel, lag, rolling_sum

RULE_VERSION = "mode-decision@1"  # 사전등록 rule-ic@1 이 잰 버전
RULE_VERSIONS = ("mode-decision@1", "mode-decision@2")
Mode = Literal["scalp", "long_term"]
MODES: tuple[Mode, ...] = ("scalp", "long_term")


def change_pct(p: Panel) -> Mat:
    with np.errstate(divide="ignore", invalid="ignore"):
        return (p.close / lag(p.close, 1) - 1.0) * 100.0


def rsi_simple(close: Mat, period: int = 14) -> Mat:
    """`relativeStrengthIndex` 그대로 — 직전 period 개 차분의 이득 합 ÷ (손실 합 || 1).
    창 안에 결측 차분이 있으면 NaN(원문은 봉 50개 미만이면 지표를 만들지 않는다)."""
    d = np.diff(close, axis=0, prepend=np.nan)
    gain = np.where(d > 0, d, 0.0)
    loss = np.where(d < 0, -d, 0.0)
    gain[np.isnan(d)] = np.nan
    loss[np.isnan(d)] = np.nan
    gsum = rolling_sum(gain, period)
    lsum = rolling_sum(loss, period)
    rs = gsum / np.where(lsum == 0, 1.0, lsum)
    return 100.0 - 100.0 / (1.0 + rs)


def sentiment_score(p: Panel, fear_greed: NDArray[np.float64]) -> Mat:
    """`calculateSentimentScore` — 가격 40 · 변동성 30 · 거래량 30, 공포탐욕이 있으면 70:30. 반올림."""
    chg = change_pct(p)
    price = np.clip((chg + 10.0) / 20.0 * 100.0, 0.0, 100.0)
    with np.errstate(divide="ignore", invalid="ignore"):
        vol = (p.high - p.low) / p.close * 100.0
        value = p.volume * p.close
        ratio = value / (rolling_sum(value, 7) / 7.0)
    vol_score = np.clip(np.clip(100.0 - vol * 5.0, 0.0, 100.0), 20.0, 80.0)
    volume_score = np.clip(50.0 + (ratio - 1.0) * 25.0, 0.0, 100.0)
    total = price * 0.4 + vol_score * 0.3 + volume_score * 0.3
    fg = fear_greed[:, None]
    mixed = np.where((fg > 0) & ~np.isnan(fg), total * 0.7 + fg * 0.3, total)
    return np.floor(mixed + 0.5)  # JS Math.round(양수)


@dataclass(frozen=True, slots=True)
class Contributions:
    """항목 → 모드 → 기여 행렬. 재료가 없는 칸은 NaN(기여 0 과 다르다)."""

    by_item: dict[str, dict[Mode, Mat]]

    def total(self, mode: Mode) -> Mat:
        """50 + 항목 합, 0~100 자름. 재료가 하나라도 없는 칸은 NaN — 부분 합을 점수로 쓰지 않는다."""
        parts = [m[mode] for m in self.by_item.values() if mode in m]
        return np.clip(50.0 + np.sum(parts, axis=0), 0.0, 100.0)


def _step(x: Mat, hi: float, hi_pts: float, lo: float, lo_pts: float, *, lo_inclusive: bool = False) -> Mat:
    fired_hi = x >= hi
    fired_lo = x <= lo if lo_inclusive else x < lo
    out = np.where(fired_hi, hi_pts, 0.0) + np.where(fired_lo, lo_pts, 0.0)
    out[np.isnan(x)] = np.nan
    return out


def contributions(
    p: Panel,
    fear_greed: NDArray[np.float64],
    whale_buy: Mat | None = None,
    whale_sell: Mat | None = None,
    version: str = RULE_VERSION,
) -> Contributions:
    """`version` — 서버 `MODE_DECISION_RULE_VERSION` 과 같은 표. `@2` 는 `@1` 판정 반영: 단타 24시간 · 심리 부호 반전,
    장기 심리 · 대형 체결 0(값은 재료로 남지만 점수에 안 들어간다). 장기 24시간 · RSI 는 같다."""
    if version not in RULE_VERSIONS:
        raise ValueError(f"모르는 규칙 버전 {version}")
    v2 = version == "mode-decision@2"
    chg = change_pct(p)
    change: dict[Mode, Mat] = {
        # > 3 · < −3 (경계 제외)
        "scalp": _gt_lt(chg, 3.0, -12.0, -3.0, 10.0) if v2 else _gt_lt(chg, 3.0, 12.0, -3.0, -10.0),
        "long_term": _gt_lt(chg, 3.0, -6.0, -3.0, 6.0),
    }
    sent = sentiment_score(p, fear_greed)
    sentiment: dict[Mode, Mat] = {
        "scalp": _step(sent, 70.0, -5.0 if v2 else 5.0, 35.0, 4.0 if v2 else -4.0, lo_inclusive=True),
        "long_term": _step(sent, 70.0, -8.0, 35.0, 10.0, lo_inclusive=True) * (0.0 if v2 else 1.0),
    }
    rsi = rsi_simple(p.close)
    rsi_d1: dict[Mode, Mat] = {
        # 단타의 라이브 재료는 1시간봉이다 — 여기 단타 값은 일봉 대리(탐색용)
        "scalp": _step(rsi, 70.0, -6.0, 35.0, 4.0, lo_inclusive=True),
        "long_term": _step(rsi, 70.0, -12.0, 35.0, 8.0, lo_inclusive=True),
    }
    items: dict[str, dict[Mode, Mat]] = {"change24h": change, "sentiment": sentiment, "rsi_d1": rsi_d1}
    if whale_buy is not None and whale_sell is not None:
        w = np.where(whale_buy > whale_sell * 1.2, 8.0, 0.0) + np.where(whale_sell > whale_buy * 1.2, -8.0, 0.0)
        w[np.isnan(whale_buy) | np.isnan(whale_sell)] = np.nan
        if v2:
            w = w * 0.0  # 재료 결측(NaN)은 그대로 — 0 과 결측을 가른다
        items["whale_flow"] = {"scalp": w, "long_term": w}
    return Contributions(items)


def _gt_lt(x: Mat, hi: float, hi_pts: float, lo: float, lo_pts: float) -> Mat:
    out = np.where(x > hi, hi_pts, 0.0) + np.where(x < lo, lo_pts, 0.0)
    out[np.isnan(x)] = np.nan
    return out

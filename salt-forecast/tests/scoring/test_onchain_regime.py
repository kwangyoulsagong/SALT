"""onchain-regime@1 실행 모양 — 합성 데이터. 성적을 단정하지 않고(python-style §6), 판정 배선만 본다."""

from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.scoring import onchain_regime as oc

START = int(datetime(2017, 1, 1, tzinfo=UTC).timestamp())
DAYS = 3200
CM_START = int(datetime(2011, 1, 1, tzinfo=UTC).timestamp())


def _world(seed: int, informative: bool) -> tuple[dict[str, OhlcvSeries], dict[str, VintagedSeries]]:
    """급락 구간이 몇 번 있다. informative 면 MVRV 가 급락 **직전 · 동안** 높다(= 미래를 안다), 아니면 잡음."""
    rng = np.random.default_rng(seed)
    at = START + DAY * np.arange(DAYS, dtype=np.int64)
    crash = np.zeros(DAYS, dtype=bool)
    for c in (600, 1500, 2400):
        crash[c : c + 120] = True
    ohlcv: dict[str, OhlcvSeries] = {}
    for sym in ("KRW-BTC", "KRW-ETH"):
        r = rng.normal(0.001, 0.03, DAYS) - np.where(crash, 0.012, 0.0)
        close = 1000 * np.exp(np.cumsum(r))
        ohlcv[sym] = OhlcvSeries(sym, at, close, close * 1.01, close * 0.99, close, np.full(DAYS, 1e6))
    cm_days = (at[-1] - CM_START) // DAY + 1
    obs = CM_START + DAY * np.arange(cm_days, dtype=np.int64)
    mvrv = rng.uniform(0.8, 2.0, cm_days)
    if informative:
        k = (at[0] - CM_START) // DAY
        hot = np.zeros(DAYS, dtype=bool)
        for c in (600, 1500, 2400):
            hot[c - 14 : c + 120] = True
        mvrv[k : k + DAYS][hot] = 5.0
    flow = rng.uniform(1e4, 3e4, cm_days)
    cm = {
        oc.MVRV: VintagedSeries.build(obs, obs + 2 * DAY, mvrv),
        oc.FLOW_IN: VintagedSeries.build(obs, obs + 2 * DAY, flow),
        oc.FLOW_OUT: VintagedSeries.build(obs, obs + 2 * DAY, flow[::-1].copy()),
        oc.ACTIVE: VintagedSeries.build(obs, obs + 2 * DAY, rng.uniform(5e5, 9e5, cm_days)),
        oc.HASH: VintagedSeries.build(obs, obs + 2 * DAY, np.linspace(1e6, 1e9, cm_days)),
    }
    return ohlcv, cm


AS_OF = datetime.fromtimestamp(START + DAY * (DAYS - 1), UTC)


def test_informative_cap_lowers_drawdown_and_counts_episodes() -> None:
    out = oc.run(*_world(1, informative=True), AS_OF)
    assert out.primary.checks[0]  # 급락을 아는 신호면 덜 빠진다
    assert out.primary.episodes >= 2 and out.primary.capped_weeks >= 20
    assert len(out.capped_spans) >= out.primary.episodes  # 구간은 짧은 틈을 합친 것이라 원 구간보다 적거나 같다


def test_report_renders_and_is_deterministic() -> None:
    a = oc.render_report("onchain-regime@1", "abc1234", AS_OF, oc.run(*_world(2, informative=False), AS_OF))
    b = oc.render_report("onchain-regime@1", "abc1234", AS_OF, oc.run(*_world(2, informative=False), AS_OF))
    assert a == b and "## 판정" in a

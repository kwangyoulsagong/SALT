"""dvol-sigma@1 실행 모양 — 합성 데이터. 성적을 단정하지 않고(python-style §6), 판정 배선만 본다."""

from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.scoring.dvol_sigma import render_report, run

START = int(datetime(2021, 1, 1, tzinfo=UTC).timestamp())
DAYS = 1300


def _world(seed: int, informative: bool) -> tuple[dict[str, OhlcvSeries], dict[str, VintagedSeries]]:
    """σ 가 국면마다 바뀐다. informative 면 DVOL 이 **다음 주** σ 를 안다(= 좋은 예측), 아니면 잡음."""
    rng = np.random.default_rng(seed)
    at = START + DAY * np.arange(DAYS, dtype=np.int64)
    ohlcv: dict[str, OhlcvSeries] = {}
    dvol: dict[str, VintagedSeries] = {}
    regime = np.repeat(rng.uniform(0.3, 1.2, DAYS // 20 + 1), 20)[:DAYS]
    for sym, base in (("KRW-BTC", "BTC"), ("KRW-ETH", "ETH")):
        r = rng.normal(0, 1, DAYS) * regime / np.sqrt(365)
        close = 1000 * np.exp(np.cumsum(r))
        ohlcv[sym] = OhlcvSeries(sym, at, close, close * 1.01, close * 0.99, close, np.full(DAYS, 1e6))
        ahead = np.concatenate((regime[7:], np.full(7, regime[-1])))
        level = (ahead if informative else rng.uniform(0.3, 1.2, DAYS)) * 100 * 1.2
        obs = at - DAY  # 봉 시작 → available = 시작 + 1일 = at
        dvol[f"dvol:{base}"] = VintagedSeries.build(obs, at, level)
    return ohlcv, dvol


AS_OF = datetime.fromtimestamp(START + DAY * (DAYS - 1), UTC)


def test_informative_dvol_passes_and_noise_does_not() -> None:
    good = run(*_world(1, informative=True), AS_OF)
    bad = run(*_world(1, informative=False), AS_OF)
    assert all(v.ci_pass for v in good.verdicts)
    assert not any(v.passed for v in bad.verdicts)
    assert bad.adopted is None
    assert set(good.days) == {"KRW-BTC", "KRW-ETH"} and min(good.days.values()) >= 500


def test_report_renders_and_is_deterministic() -> None:
    a = render_report("dvol-sigma@1", "abc1234", AS_OF, run(*_world(2, informative=False), AS_OF))
    b = render_report("dvol-sigma@1", "abc1234", AS_OF, run(*_world(2, informative=False), AS_OF))
    assert a == b and "## 판정" in a

"""원인 설명 채점(cause-explain@1) — 종류 · 기준 정의 · 과거만 · cold · 판정 사유 · 판정 날짜."""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np
import pytest

from salt_forecast.domain.cause_explain import (
    LOOKS,
    MIN_PAST,
    NOT_LIKELY,
    Cell,
    Row,
    base_of,
    judge,
    kind_of,
    look_due,
    score_cell,
)


@pytest.mark.parametrize(
    ("kind", "strength", "want"),
    [
        ("sector", "likely", "sector"),
        ("sector", "possible", NOT_LIKELY),
        ("none", "none", NOT_LIKELY),
        ("news", "likely", "news"),
    ],
)
def test_kind_of(kind: str, strength: str, want: str) -> None:
    assert kind_of(kind, strength) == want


@pytest.mark.parametrize(
    ("market", "split", "want"),
    [
        ("kr", {"sector": 0.4, "market": -1.0}, "pos"),
        ("kr", {"sector": None, "market": -1.0}, "neg"),  # 업종 없으면 시장 부호
        ("kr", {"sector": 0.0, "market": 0.0}, "none"),
        ("kr", None, "none"),
        ("crypto", {"sector": 5.0, "market": -0.2}, "neg"),  # 코인은 시장(비트코인) 몫
    ],
)
def test_base_of(market: str, split: dict[str, object] | None, want: str) -> None:
    assert base_of(market, split) == want


D0 = date(2026, 11, 16)


def _rows(n_days: int, per_day: int, rng: np.random.Generator, informative: bool) -> list[Row]:
    out: list[Row] = []
    for d in range(n_days):
        cap = 1_000_000 + d * 86_400
        for i in range(per_day):
            kind = "sector" if i % 2 == 0 else "market"
            base = "pos" if rng.random() < 0.5 else "neg"
            up = (kind == "sector") if informative and rng.random() < 0.85 else rng.random() < 0.5
            out.append(Row(f"S{i}", D0 + timedelta(days=d), cap, cap + 86_400 - 1, kind, base, 0.01 if up else -0.01))
    return out


def test_score_cell_detects_information_and_noise() -> None:
    good = score_cell("kr", 1, _rows(60, 20, np.random.default_rng(1), informative=True))
    assert good.rows_scored > 0 and good.skill > 0.1 and good.p < 0.01
    noise = score_cell("kr", 1, _rows(60, 20, np.random.default_rng(2), informative=False))
    assert noise.p > 0.01  # 정보 없는 종류는 기준을 못 이긴다


def test_cold_until_enough_past() -> None:
    c = score_cell("kr", 1, _rows(3, 20, np.random.default_rng(3), informative=True))
    # 3일 × 20 — 같은 종류 과거가 MIN_PAST(30) 이 되기 전 행은 전부 cold
    assert c.rows_scored + c.rows_cold == 60
    assert c.rows_scored <= 20 and MIN_PAST == 30


def test_zero_labels_excluded() -> None:
    rows = [Row("A", D0, 1, 2, "sector", "pos", 0.0)]
    c = score_cell("kr", 1, rows)
    assert c.rows_zero == 1 and c.rows_scored == 0


def test_judge_reasons() -> None:
    small = Cell("kr", 1, rows_scored=10, days=5, p=0.0001)
    weak = Cell("kr", 5, rows_scored=400, days=40, p=0.4)
    strong = Cell("crypto", 1, rows_scored=400, days=40, p=0.0001)
    judge([small, weak, strong], 0.0166667, last_look=False)
    assert (small.status, small.reason) == ("forward", "below_min")
    assert (weak.status, weak.reason) == ("forward", "no_effect")
    assert strong.status == "pass"
    judge([small, weak], 0.0166667, last_look=True)
    assert small.status == "fail" and weak.status == "fail"


def test_look_due() -> None:
    assert look_due(LOOKS[0] - timedelta(days=1), 0) is None
    assert look_due(LOOKS[0], 0) == 0
    assert look_due(LOOKS[1] + timedelta(days=3), 0) == 0  # 잠들어 놓쳐도 안 한 첫 판정부터
    assert look_due(LOOKS[2], 3) is None

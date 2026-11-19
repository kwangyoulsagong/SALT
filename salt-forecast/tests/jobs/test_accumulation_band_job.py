"""밴드 적립 행의 밴드 표 — 서버 · 화면이 그리는 줄이 사전등록(판정)과 같다(SRV-REQ-020 FR-74)."""

from __future__ import annotations

import json
import math
import tomllib

import pytest

from salt_forecast.jobs.accumulation_band import BANDS, DEFAULT_PREREG, bands_json


@pytest.mark.parametrize("asset", ["btc", "kospi"])
def test_bands_json_matches_preregistration(asset: str) -> None:
    prereg = tomllib.loads(DEFAULT_PREREG.read_text(encoding="utf-8"))
    registered = prereg["indicator"][asset]["bands"]
    rows = json.loads(bands_json(asset))
    assert [r["key"] for r in rows] == [b["key"] for b in registered]
    assert [r["multiplier"] for r in rows] == [b["multiplier"] for b in registered]
    for row, band in zip(rows, registered, strict=True):
        if band["below"] == "inf":
            assert row["below"] is None  # JSON 에 inf 가 없다 — 끝 줄은 null
        else:
            assert row["below"] == band["below"]


def test_last_band_is_open_ended_and_json_is_strict() -> None:
    for asset, bands in BANDS.items():
        assert math.isinf(bands[-1].below), asset
        # 표준 JSON 만(파이썬 json 의 Infinity 확장이 섞이면 서버 JSON.parse 가 깨진다)
        json.loads(bands_json(asset), parse_constant=lambda c: pytest.fail(f"비표준 상수 {c}"))

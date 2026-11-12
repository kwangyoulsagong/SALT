"""사건 종류 분류 — 공용 사례 표(contracts/news-kind/cases.json)를 서버와 같이 읽는다(news-reaction@1)."""

from __future__ import annotations

import json
import tomllib
from pathlib import Path

import pytest

from salt_forecast.domain.news_kind import OTHER, classify, from_prereg

ROOT = Path(__file__).resolve().parents[3]
PREREG = ROOT / "salt-forecast" / "preregistration" / "2026-11-12-news-reaction.toml"
CASES = json.loads((ROOT / "contracts" / "news-kind" / "cases.json").read_text())["cases"]
DICT = from_prereg(tomllib.loads(PREREG.read_text()))


@pytest.mark.parametrize("case", CASES, ids=[c["title"][:30] for c in CASES])
def test_공용_사례(case: dict[str, object]) -> None:
    got = classify(DICT, str(case["market"]), str(case["origin"]), int(case["codes"]), str(case["title"]))  # pyright: ignore[reportArgumentType]
    assert got == case["kind"]


def test_사례가_모든_종류를_한_번은_맞힌다() -> None:
    hit = {c["kind"] for c in CASES}
    assert {r.id for r in DICT.rules} <= hit
    assert OTHER in hit


def test_모르는_시장은_예외() -> None:
    with pytest.raises(ValueError):
        classify(DICT, "us", "news", 1, "x")

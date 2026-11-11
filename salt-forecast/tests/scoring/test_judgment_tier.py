"""등급 실행 — 출처 경계(price_only 는 등급을 만들지 않는다) · 강등 뒤 행만 승격에 센다."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from salt_forecast.domain.judgment_tier import Previous, Row
from salt_forecast.scoring.judgment_tier import render_report, run

NOW = datetime(2026, 11, 11, tzinfo=UTC)


def _rows(days: int, per_day: list[tuple[str, float]], start: date) -> list[Row]:
    out: list[Row] = []
    for i in range(days):
        d = start + timedelta(days=i)
        out += [Row(d, datetime(d.year, d.month, d.day, 1, tzinfo=UTC), a, r) for a, r in per_day]
    return out


def test_all_four_cells_and_reference_by_default() -> None:
    runs = run({}, {}, NOW)
    assert [(c.market, c.mode) for c in runs] == [
        ("crypto", "scalp"), ("crypto", "long_term"), ("kr", "scalp"), ("kr", "long_term"),
    ]  # fmt: skip
    assert {c.row.tier for c in runs} == {"reference"}
    assert {c.row.reason for c in runs} == {"no_candidate"}
    assert "판단 라벨 등급" in render_report("judgment-tier@1", "abc", NOW, runs)


def test_price_only_never_makes_caution() -> None:
    bad = _rows(60, [("review_accumulation", -0.05), ("avoid", 0.05)], date(2025, 1, 1))
    runs = run({("kr", "scalp", "backtest_price_only"): bad}, {}, NOW)
    kr_scalp = next(c for c in runs if (c.market, c.mode) == ("kr", "scalp"))
    assert kr_scalp.row.tier == "reference"
    runs = run({("kr", "long_term", "backtest_full"): bad}, {}, NOW)
    kr_long = next(c for c in runs if (c.market, c.mode) == ("kr", "long_term"))
    assert (kr_long.row.tier, kr_long.row.basis_source) == ("caution", "backtest_full")


def test_promotion_counts_only_rows_after_demotion() -> None:
    # 강등 전 좋은 라이브 700일치 — 강등 뒤 행이 없으면 다시 검증됨이 될 수 없다
    good = _rows(700, [("review_accumulation", 0.03), ("avoid", -0.03)], date(2024, 11, 1))
    demoted = datetime(2026, 11, 1, tzinfo=UTC)
    runs = run({("crypto", "scalp", "live"): good}, {("crypto", "scalp"): Previous("reference", demoted)}, NOW)
    c = next(c for c in runs if (c.market, c.mode) == ("crypto", "scalp"))
    assert c.row.tier == "reference" and c.row.demoted_at == demoted
    assert c.row.live_rows == 1400  # 화면 basis 는 전체 라이브(승격 판단만 강등 뒤 행)
    runs = run({("crypto", "scalp", "live"): good}, {}, NOW)
    c = next(c for c in runs if (c.market, c.mode) == ("crypto", "scalp"))
    assert c.row.tier == "verified"

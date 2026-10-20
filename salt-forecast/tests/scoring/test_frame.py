"""열 저장 백테스트 출력(FC-REQ-020 P4) — 행 객체로 계산한 것과 같은 값이어야 한다."""

from __future__ import annotations

from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.quantiles import Z_SCORES, QuantileForecast
from salt_forecast.domain.scoring import score
from salt_forecast.scoring.coverage import TailObs
from salt_forecast.scoring.frame import DIRECTIONS, ColumnsBuilder
from salt_forecast.scoring.report import render
from salt_forecast.scoring.scale_report import ScaleObs
from salt_forecast.store.predictions import PredictionRow, ScoreRow

T0 = 1_700_000_000
WEEK = 7 * 86_400
Raw = tuple[str, int, int, str, float, QuantileForecast, str, float, float]


def _build(
    seed: int,
) -> tuple[ColumnsBuilder, list[tuple[str, int, int, str, float, QuantileForecast, str, float, float]]]:
    rng = np.random.default_rng(seed)
    b = ColumnsBuilder()
    raw: list[Raw] = []
    for w in range(30):
        for h in (1, 2):
            for s in ("A", "B", "C"):
                for m in ("base", "m1", "m2"):
                    width = float(rng.uniform(0.02, 0.1))
                    fc = QuantileForecast.from_array(Z_SCORES * width + rng.normal(0, 0.01), float(rng.uniform()))
                    d = str(rng.choice(DIRECTIONS))
                    # 실현값 0 · 구간 끝과 같은 값도 섞는다(경계 비교)
                    r = float(rng.choice([0.0, fc.q[0], fc.q[-1], fc.q[1], rng.normal(0, 0.06)]))
                    row = (s, h, T0 + w * WEEK, m, float(rng.uniform(1, 100)), fc, d, r, width)
                    raw.append(row)
                    b.add(*row)  # pyright: ignore[reportArgumentType]
            b.flush()
    return b, raw


def test_vector_scores_match_score() -> None:
    b, raw = _build(1)
    cols = b.build()
    rows = list(cols.score_rows())
    assert len(rows) == len(raw)
    for row, (s, h, t, m, _, fc, d, r, _) in zip(rows, raw, strict=True):
        assert (row.symbol, row.horizon_weeks, int(row.as_of.timestamp()), row.model_version) == (s, h, t, m)
        assert row.score == score(fc, d, r)  # pyright: ignore[reportArgumentType]


def test_rows_tails_scales_predictions_roundtrip() -> None:
    b, raw = _build(2)
    cols = b.build()
    preds = list(cols.prediction_rows())
    assert preds[5] == PredictionRow(
        raw[5][0],
        raw[5][1],
        datetime.fromtimestamp(raw[5][2], tz=UTC),
        raw[5][3],
        "backtest",
        raw[5][4],
        raw[5][5],
        raw[5][6],  # pyright: ignore[reportArgumentType]
    )
    m1 = [x for x in raw if x[3] == "m1"]
    assert cols.tails("m1") == [TailObs(s, h, t, fc.q[0], fc.q[-1], r) for s, h, t, _, _, fc, _, r, _ in m1]
    assert cols.scales("m1") == [ScaleObs(s, h, t, sc, r) for s, h, t, _, _, _, _, r, sc in m1]
    assert {r.model_version for r in cols.score_rows(["m2"])} == {"m2"}


def test_render_columns_equals_rows() -> None:
    b, _ = _build(3)
    cols = b.build()
    rows: list[ScoreRow] = list(cols.score_rows())
    args = (["base", "m1", "m2"], "base", "t", ["- 메모"])
    assert render(cols, *args) == render(rows, *args)


def test_empty_builder() -> None:
    cols = ColumnsBuilder().build()
    assert len(cols) == 0
    assert list(cols.score_rows()) == []

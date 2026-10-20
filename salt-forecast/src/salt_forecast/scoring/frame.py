"""백테스트 출력을 열로 — 예측 · 점수를 행 객체 대신 numpy 열로 든다(FC-REQ-020 P4, performance.md §2).

국내 전 종목 백테스트는 예측 691만 행이다. 행마다 PredictionRow · QuantileForecast · ScoreRow · Score · TailObs ·
ScaleObs 를 들면 1KB 가까이 들어 수 GB 였다. 여기서는 as_of 하나씩 열로 굳히고, 행 객체는 쓰는 곳에서 그 모델만
잠깐 만든다. 점수는 `domain.scoring.score` 와 같은 값을 벡터로 낸다(tests/scoring/test_frame.py).
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.quantiles import LEVELS, LEVELS_ARR, Direction, QuantileForecast
from salt_forecast.domain.scoring import Score
from salt_forecast.scoring.coverage import TailObs
from salt_forecast.scoring.scale_report import ScaleObs
from salt_forecast.store.predictions import PredictionRow, ScoreRow

DIRECTIONS: tuple[Direction, ...] = ("up", "down", "abstain")
_I05, _I10, _I90, _I95 = (LEVELS.index(x) for x in (0.05, 0.10, 0.90, 0.95))


@dataclass(frozen=True, slots=True)
class BacktestColumns:
    """백테스트 예측 · 점수 한 벌. 행 순서는 emit 순서 그대로다(as_of → 기간 → 종목 → 모델)."""

    symbols: list[str]  # 코드 → 종목
    models: list[str]  # 코드 → 모델 버전
    sym: NDArray[np.int32]
    h: NDArray[np.int64]
    as_of: NDArray[np.int64]  # epoch 초
    model: NDArray[np.int32]
    base_close: NDArray[np.float64]
    q: NDArray[np.float64]  # (n, LEVELS)
    p_up: NDArray[np.float64]
    direction: NDArray[np.int8]  # DIRECTIONS 의 번호
    realized: NDArray[np.float64]
    scale: NDArray[np.float64]  # 보정 전 척도 — 척도 QLIKE
    hit90: NDArray[np.bool_]
    hit80: NDArray[np.bool_]
    width90: NDArray[np.float64]
    pinball: NDArray[np.float64]
    direction_hit: NDArray[np.int8]  # −1 = 판정 안 함(None) · 0 · 1

    def __len__(self) -> int:
        return int(self.realized.size)

    def _select(self, models: Iterable[str]) -> NDArray[np.intp]:
        codes = [i for i, m in enumerate(self.models) if m in set(models)]
        return np.flatnonzero(np.isin(self.model, codes))

    def score_rows(self, models: Iterable[str] | None = None) -> Iterator[ScoreRow]:
        """ScoreRow 를 하나씩 — `models` 가 있으면 그 모델만. 같은 as_of 는 같은 datetime 객체를 나눠 쓴다."""
        idx = np.arange(len(self)) if models is None else self._select(models)
        stamps: dict[int, datetime] = {}
        for s, h, t, m, r, h90, h80, w, p, d, dh in zip(
            self.sym[idx].tolist(),
            self.h[idx].tolist(),
            self.as_of[idx].tolist(),
            self.model[idx].tolist(),
            self.realized[idx].tolist(),
            self.hit90[idx].tolist(),
            self.hit80[idx].tolist(),
            self.width90[idx].tolist(),
            self.pinball[idx].tolist(),
            self.direction[idx].tolist(),
            self.direction_hit[idx].tolist(),
            strict=True,
        ):
            at = stamps.get(t) or stamps.setdefault(t, datetime.fromtimestamp(t, tz=UTC))
            hit = None if dh < 0 else bool(dh)
            yield ScoreRow(
                self.symbols[int(s)],
                h,
                at,
                self.models[int(m)],
                "backtest",
                Score(r, h90, h80, w, p, DIRECTIONS[int(d)], hit),
            )

    def prediction_rows(self) -> Iterator[PredictionRow]:
        stamps: dict[int, datetime] = {}
        for i in range(len(self)):
            t = int(self.as_of[i])
            at = stamps.get(t) or stamps.setdefault(t, datetime.fromtimestamp(t, tz=UTC))
            yield PredictionRow(
                self.symbols[int(self.sym[i])],
                int(self.h[i]),
                at,
                self.models[int(self.model[i])],
                "backtest",
                float(self.base_close[i]),
                QuantileForecast(tuple(self.q[i].tolist()), float(self.p_up[i])),
                DIRECTIONS[int(self.direction[i])],
            )

    def tails(self, model: str) -> list[TailObs]:
        """90% 구간 꼬리 관측 — 그 모델만."""
        idx = self._select([model])
        return [
            TailObs(self.symbols[int(s)], h, t, lo, hi, r)
            for s, h, t, lo, hi, r in zip(
                self.sym[idx].tolist(),
                self.h[idx].tolist(),
                self.as_of[idx].tolist(),
                self.q[idx, _I05].tolist(),
                self.q[idx, _I95].tolist(),
                self.realized[idx].tolist(),
                strict=True,
            )
        ]

    def scales(self, model: str) -> list[ScaleObs]:
        idx = self._select([model])
        return [
            ScaleObs(self.symbols[int(s)], h, t, sc, r)
            for s, h, t, sc, r in zip(
                self.sym[idx].tolist(),
                self.h[idx].tolist(),
                self.as_of[idx].tolist(),
                self.scale[idx].tolist(),
                self.realized[idx].tolist(),
                strict=True,
            )
        ]


def vector_scores(
    q: NDArray[np.float64], direction: NDArray[np.int8], realized: NDArray[np.float64]
) -> tuple[NDArray[np.bool_], NDArray[np.bool_], NDArray[np.float64], NDArray[np.float64], NDArray[np.int8]]:
    """`domain.scoring.score` 를 행마다 부른 것과 같은 값 — (hit90, hit80, width90, pinball, direction_hit)."""
    lo90, hi90, lo80, hi80 = q[:, _I05], q[:, _I95], q[:, _I10], q[:, _I90]
    hit90 = (lo90 <= realized) & (realized <= hi90)
    hit80 = (lo80 <= realized) & (realized <= hi80)
    diff = realized[:, None] - q
    pinball = np.maximum(LEVELS_ARR * diff, (LEVELS_ARR - 1.0) * diff).mean(axis=1)
    up = direction == DIRECTIONS.index("up")
    judged = (direction != DIRECTIONS.index("abstain")) & (realized != 0.0)
    dh = np.where(judged, ((realized > 0) == up).astype(np.int8), np.int8(-1)).astype(np.int8)
    return hit90, hit80, hi90 - lo90, pinball, dh


class ColumnsBuilder:
    """emit 한 행을 받아 `flush` 마다 배열 조각으로 굳힌다 — 파이썬 객체는 조각 하나 크기만 든다."""

    def __init__(self) -> None:
        self._symbols: dict[str, int] = {}
        self._models: dict[str, int] = {}
        self._rows: list[tuple[int, int, int, int, float, Sequence[float], float, int, float, float]] = []
        self._parts: list[tuple[NDArray[np.generic], ...]] = []

    def add(
        self,
        symbol: str,
        h: int,
        as_of: int,
        model: str,
        base_close: float,
        forecast: QuantileForecast,
        direction: Direction,
        realized: float,
        scale: float,
    ) -> None:
        self._rows.append(
            (
                self._symbols.setdefault(symbol, len(self._symbols)),
                h,
                as_of,
                self._models.setdefault(model, len(self._models)),
                base_close,
                forecast.q,
                forecast.p_up,
                DIRECTIONS.index(direction),
                realized,
                scale,
            )
        )

    def flush(self) -> None:
        if not self._rows:
            return
        sym, h, t, m, base, q, p_up, d, r, sc = zip(*self._rows, strict=True)
        self._rows = []
        self._parts.append(
            (
                np.asarray(sym, dtype=np.int32),
                np.asarray(h, dtype=np.int64),
                np.asarray(t, dtype=np.int64),
                np.asarray(m, dtype=np.int32),
                np.asarray(base, dtype=np.float64),
                np.asarray(q, dtype=np.float64).reshape(-1, len(LEVELS)),
                np.asarray(p_up, dtype=np.float64),
                np.asarray(d, dtype=np.int8),
                np.asarray(r, dtype=np.float64),
                np.asarray(sc, dtype=np.float64),
            )
        )

    def build(self) -> BacktestColumns:
        self.flush()
        parts = self._parts or [self._empty()]
        self._parts = []
        sym, h, t, m, base, q, p_up, d, r, sc = (np.concatenate([p[k] for p in parts]) for k in range(10))
        q = q.astype(np.float64, copy=False)
        d = d.astype(np.int8, copy=False)
        r = r.astype(np.float64, copy=False)
        hit90, hit80, width90, pinball, dh = vector_scores(q, d, r)
        return BacktestColumns(
            list(self._symbols),
            list(self._models),
            sym.astype(np.int32, copy=False),
            h.astype(np.int64, copy=False),
            t.astype(np.int64, copy=False),
            m.astype(np.int32, copy=False),
            base.astype(np.float64, copy=False),
            q,
            p_up.astype(np.float64, copy=False),
            d,
            r,
            sc.astype(np.float64, copy=False),
            hit90,
            hit80,
            width90,
            pinball,
            dh,
        )

    @staticmethod
    def _empty() -> tuple[NDArray[np.generic], ...]:
        i32, i64, f64 = np.empty(0, np.int32), np.empty(0, np.int64), np.empty(0, np.float64)
        return (i32, i64, i64, i32, f64, np.empty((0, len(LEVELS))), f64, np.empty(0, np.int8), f64, f64)

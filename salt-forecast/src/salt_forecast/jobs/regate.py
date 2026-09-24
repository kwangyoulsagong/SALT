"""게이트만 다시 판정 — 저장된 점수로. 챔피언을 바꾼 뒤나 게이트 규칙을 바꾼 뒤에 쓴다(학습 없음)."""

from __future__ import annotations

from datetime import UTC, datetime

from salt_forecast.jobs._common import base_parser, run_job
from salt_forecast.models.engine import BASELINE, HORIZONS
from salt_forecast.models.registry import PRODUCTION
from salt_forecast.scoring.evaluate import gates
from salt_forecast.store.db import engine
from salt_forecast.store.predictions import scores_for, write_gates
from salt_forecast.store.prices import load_close_series

JOB = "regate"


def main(argv: list[str] | None = None) -> int:
    args = base_parser("게이트 재판정").parse_args(argv)

    def body() -> int:
        eng = engine()
        now = int(datetime.now(UTC).timestamp())
        series = load_close_series(eng, "upbit", "1d")
        universe = sorted({(s, h) for s in series for h in HORIZONS})
        stale = {s for s, c in series.items() if (c.last_at() or 0) < now - 2 * 86_400}
        rows = gates(scores_for(eng, [PRODUCTION, BASELINE]), PRODUCTION, BASELINE, stale, universe)
        return len(rows) if args.dry_run else write_gates(eng, rows)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

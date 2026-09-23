"""매일: live 예측 → 기간 지난 live 채점 → 게이트.

증분 수집은 ingest_prices · ingest_market 이 먼저 돈다(ops/daily.sh).
"""

from __future__ import annotations

from datetime import UTC, datetime

from salt_forecast.domain.calendar import floor_day
from salt_forecast.domain.series import realized_log_return
from salt_forecast.jobs._common import (
    base_parser,
    logger,
    parse_as_of,
    run_job,
    symbols_arg,
)
from salt_forecast.jobs._common import (
    progress_logger as _progress,
)
from salt_forecast.jobs._data import load
from salt_forecast.models.engine import BASELINE, HORIZONS, WalkForward
from salt_forecast.models.registry import PRODUCTION, model_params, providers
from salt_forecast.scoring.evaluate import gates, score_prediction
from salt_forecast.store.db import engine
from salt_forecast.store.predictions import (
    PredictionRow,
    ScoreRow,
    register_model,
    scores_for,
    unscored_live,
    write_gates,
    write_predictions,
    write_scores,
)

JOB = "daily"


def main(argv: list[str] | None = None) -> int:
    args = base_parser("live 예측 · 채점 · 게이트").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        now = parse_as_of(args.as_of)
        as_of = floor_day(int(now.timestamp()))
        series, ctx = load(eng, now, symbols_arg(args.symbols))
        provs, _ = providers(series, ctx, extra_as_ofs=[as_of], on_progress=_progress(log, JOB), with_challengers=False)
        wf = WalkForward(series, provs)
        preds = [
            PredictionRow(
                e.symbol,
                e.horizon_weeks,
                datetime.fromtimestamp(e.as_of, tz=UTC),
                e.model_version,
                "live",
                e.base_close,
                e.forecast,
                e.direction,
            )
            for e in wf.emit(as_of, with_realized=False)
        ]
        pending = unscored_live(eng)
        scored: list[ScoreRow] = []
        for p in pending:
            s = series.get(p.symbol)
            r = realized_log_return(s, int(p.as_of.timestamp()), p.horizon_weeks) if s else None
            if r is not None:
                scored.append(score_prediction(p, r))
        log.info(
            "daily",
            extra={"fields": {"job": JOB, "predictions": len(preds), "pending": len(pending), "scored": len(scored)}},
        )
        if args.dry_run:
            return len(preds) + len(scored)
        for m in provs:
            register_model(eng, m, m.split("@")[0], model_params(m))
        n = write_predictions(eng, preds) + write_scores(eng, scored)
        universe = sorted({(s, h) for s in series for h in HORIZONS})
        stale = {s for s, c in series.items() if (c.last_at() or 0) < int(now.timestamp()) - 2 * 86_400}
        n += write_gates(eng, gates(scores_for(eng, [PRODUCTION, BASELINE]), PRODUCTION, BASELINE, stale, universe))
        return n

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

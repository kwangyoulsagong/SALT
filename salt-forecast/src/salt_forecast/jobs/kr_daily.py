"""국내 주식 매일: live 예측 → 기간 지난 live 채점 → 게이트(FC-REQ-009).

as_of = 지금 이전에 시작한 마지막 거래일 09:00 KST — 기준 종가는 그 전 거래일 것이다. 장이 없는 날 돌면 직전
거래일 as_of 를 다시 쓴다(같은 값, 멱등). 주 첫 거래일 as_of 만 게이트 표본이 된다(`KrxSessions.on_grid`).
"""

from __future__ import annotations

from datetime import UTC, datetime

from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs._data import load_kr
from salt_forecast.models.engine import HORIZONS, WalkForward
from salt_forecast.models.kr_stock import KR_BASELINE, KR_MODELS, KR_PRODUCTION, kr_model_params, kr_providers
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

JOB = "kr_daily"


def main(argv: list[str] | None = None) -> int:
    args = base_parser("국내 주식 live 예측 · 채점 · 게이트").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        now = parse_as_of(args.as_of)
        t_now = int(now.timestamp())
        series, cal = load_kr(eng, now)
        as_of = cal.latest_session(t_now)
        if not series or as_of is None:
            log.warning("국내 주식 일봉 · 거래일 없음 — 건너뜀", extra={"fields": {"job": JOB}})
            return 0
        wf = WalkForward(series, kr_providers(cal), schedule=cal)
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
        pending = unscored_live(eng, KR_MODELS)
        scored: list[ScoreRow] = []
        for p in pending:
            s = series.get(p.symbol)
            r = cal.realized(s, int(p.as_of.timestamp()), p.horizon_weeks) if s else None
            if r is not None:
                scored.append(score_prediction(p, r))
        fields = {
            "job": JOB,
            "as_of": datetime.fromtimestamp(as_of, tz=UTC),
            "first_of_week": cal.on_grid(as_of),
            "predictions": len(preds),
            "pending": len(pending),
            "scored": len(scored),
        }
        log.info("kr_daily", extra={"fields": fields})
        if args.dry_run:
            return len(preds) + len(scored)
        for m in KR_MODELS:
            register_model(eng, m, m.split("@")[0], kr_model_params(m))
        n = write_predictions(eng, preds) + write_scores(eng, scored)
        universe = sorted({(s, h) for s in series for h in HORIZONS})
        stale = {s for s, c in series.items() if not cal.fresh(c, t_now, slack=1)}
        rows = gates(
            scores_for(eng, [KR_PRODUCTION, KR_BASELINE]), KR_PRODUCTION, KR_BASELINE, stale, universe, cal.on_grid
        )
        return n + write_gates(eng, rows)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

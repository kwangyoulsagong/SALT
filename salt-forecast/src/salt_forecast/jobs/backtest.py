"""워크포워드 백테스트 → prediction · score (kind=backtest) + 게이트 + 리포트."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

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
from salt_forecast.scoring.evaluate import gates, score_forecast
from salt_forecast.scoring.report import render
from salt_forecast.store.db import engine
from salt_forecast.store.predictions import (
    PredictionRow,
    ScoreRow,
    register_model,
    scores_for,
    write_gates,
    write_predictions,
    write_scores,
)

JOB = "backtest"
REPORTS = Path(__file__).resolve().parents[3] / "reports"


def _dt(t: int) -> datetime:
    return datetime.fromtimestamp(t, tz=UTC)


def main(argv: list[str] | None = None) -> int:
    args = base_parser("워크포워드 백테스트").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        now = parse_as_of(args.as_of)
        series, ctx = load(eng, now, symbols_arg(args.symbols))
        provs, fitted = providers(series, ctx, on_progress=_progress(log, JOB))
        wf = WalkForward(series, provs)
        preds: list[PredictionRow] = []
        scores: list[ScoreRow] = []
        for t in wf.backtest_as_ofs():
            for e in wf.emit(t, with_realized=True):
                assert e.realized is not None
                p = PredictionRow(
                    e.symbol,
                    e.horizon_weeks,
                    _dt(e.as_of),
                    e.model_version,
                    "backtest",
                    e.base_close,
                    e.forecast,
                    e.direction,
                )
                preds.append(p)
                scores.append(
                    score_forecast(
                        p.symbol,
                        p.horizon_weeks,
                        p.as_of,
                        p.model_version,
                        "backtest",
                        p.forecast,
                        p.direction,
                        e.realized,
                    )
                )
        notes = [
            f"- 실행 {now.date()} · as_of 격자 {len(wf.backtest_as_ofs())}주 · 보정 풀 52주 · 엠바고 h주",
            "- 표본은 **겹친다**(h>1 이면 이웃 as_of 의 라벨이 겹친다) — 유효 표본은 표의 수보다 작다",
            "- 대상: 업비트 원화 마켓 **현재 상장 종목**(생존 편향 — 상장폐지 코인 이력 없음)",
            "- LightGBM 은 52주 학습 이력이 쌓인 뒤부터 예측한다 — 그 앞 주에는 이 모델 행이 없다",
        ]
        for version, model in fitted.items():
            for h, imp in sorted(model.importance.items()):
                top = sorted(imp.items(), key=lambda kv: -kv[1])[:6]
                notes.append(f"- `{version}` {h}주 기여도 상위: " + ", ".join(f"`{k}` {v:.0%}" for k, v in top))
        report = render(scores, list(provs), BASELINE, f"워크포워드 백테스트 — 운영 {PRODUCTION}", notes)
        log.info("백테스트", extra={"fields": {"job": JOB, "predictions": len(preds)}})
        if args.dry_run:
            print(report)
            return len(preds)
        for m in provs:
            register_model(eng, m, m.split("@")[0], model_params(m))
        n = write_predictions(eng, preds) + write_scores(eng, scores)
        REPORTS.mkdir(exist_ok=True)
        (REPORTS / f"backtest-{now.date()}.md").write_text(report, encoding="utf-8")
        universe = sorted({(s, h) for s in series for h in HORIZONS})
        stale = {s for s, c in series.items() if (c.last_at() or 0) < int(now.timestamp()) - 2 * 86_400}
        n += write_gates(eng, gates(scores_for(eng, [PRODUCTION, BASELINE]), PRODUCTION, BASELINE, stale, universe))
        return n

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

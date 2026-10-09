"""국내 주식 워크포워드 백테스트 → prediction · score (kind=backtest) + 게이트 + 리포트(FC-REQ-009).

코인 `backtest` 와 같은 엔진 · 같은 채점 · 같은 게이트 — 다른 것은 달력(주 첫 거래일 · 5거래일)과 모델 버전 이름,
그리고 보정 · 채점 풀에 국내 주식만 들어간다는 것(FEATURE-011 FR-82).
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs._data import load_kr
from salt_forecast.models.engine import HORIZONS, POOL_WEEKS, WalkForward
from salt_forecast.models.kr_stock import KR_BASELINE, KR_MODELS, KR_PRODUCTION, kr_model_params, kr_providers
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

JOB = "kr_backtest"
REPORTS = Path(__file__).resolve().parents[3] / "reports"


def _dt(t: int) -> datetime:
    return datetime.fromtimestamp(t, tz=UTC)


def main(argv: list[str] | None = None) -> int:
    args = base_parser("국내 주식 워크포워드 백테스트").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        now = parse_as_of(args.as_of)
        series, cal = load_kr(eng, now)
        if not series:
            log.warning("국내 주식 일봉 없음 — ingest_kr_stock 먼저", extra={"fields": {"job": JOB}})
            return 0
        wf = WalkForward(series, kr_providers(cal), schedule=cal)
        as_ofs = wf.backtest_as_ofs()
        preds: list[PredictionRow] = []
        scores: list[ScoreRow] = []
        for t in as_ofs:
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
        first = _dt(as_ofs[0]).date() if as_ofs else None
        last = _dt(max(int(p.as_of.timestamp()) for p in preds)).date() if preds else None
        notes = [
            f"- 실행 {now.date()} · 격자 = 주 첫 거래일 09:00 KST(월요일 휴장이면 화요일) {len(as_ofs)}주"
            f"({first} ~ 라벨 끝난 마지막 {last}) · 보정 풀 {POOL_WEEKS}주 · 엠바고 = 라벨 끝(5h 거래일 뒤 16:00 KST)",
            "- 기간 h주 = **5h 거래일**. 기준 종가 = as_of 에 아는 마지막 거래일 종가(직전 거래일)",
            "- 표본은 **겹친다**(h>1 이면 이웃 as_of 의 라벨이 겹친다) — 유효 표본은 표의 수보다 작다",
            f"- 대상: 서버 시세 유니버스(보유 → 관심 → 시가총액) **현재** {len(series)}종목, 일봉 2년 — 생존 편향"
            "(상장폐지 · 유니버스에서 빠진 종목 이력 없음) · 시가총액 상위 위주라 대형주 편향",
            "- 보정 · 채점 풀은 국내 주식만(코인과 섞지 않음). LightGBM 없음 — 풀링 종목 200 미만",
        ]
        report = render(
            scores, list(KR_MODELS), KR_BASELINE, f"국내 주식 워크포워드 백테스트 — 운영 {KR_PRODUCTION}", notes
        )
        log.info("백테스트", extra={"fields": {"job": JOB, "predictions": len(preds), "as_ofs": len(as_ofs)}})
        if args.dry_run:
            print(report)
            return len(preds)
        for m in KR_MODELS:
            register_model(eng, m, m.split("@")[0], kr_model_params(m))
        n = write_predictions(eng, preds) + write_scores(eng, scores)
        REPORTS.mkdir(exist_ok=True)
        (REPORTS / f"kr-backtest-{now.date()}.md").write_text(report, encoding="utf-8")
        universe = sorted({(s, h) for s in series for h in HORIZONS})
        t_now = int(now.timestamp())
        stale = {s for s, c in series.items() if not cal.fresh(c, t_now, slack=1)}
        rows = gates(
            scores_for(eng, [KR_PRODUCTION, KR_BASELINE]), KR_PRODUCTION, KR_BASELINE, stale, universe, cal.on_grid
        )
        return n + write_gates(eng, rows)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

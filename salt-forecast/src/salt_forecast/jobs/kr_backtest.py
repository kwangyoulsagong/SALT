"""국내 주식 워크포워드 백테스트 → prediction · score (kind=backtest) + 게이트 + 리포트(FC-REQ-009 · FC-REQ-020).

코인 `backtest` 와 같은 엔진 · 같은 채점 — 다른 것은 달력(주 첫 거래일 · 5거래일)과 모델 버전 이름, 보정 · 채점 풀에
국내 주식만 들어간다는 것(FEATURE-011 FR-82), 그리고 **게이트**: 실력은 기간마다 풀링 검정 한 번, 종목은 거부권만
(FC-REQ-020 FR-1 · FR-2). 리포트에 풀링 표 · 상시 플라시보(FR-5) · 꼬리별 커버리지(FR-4)를 싣는다.
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime
from pathlib import Path

from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs._data import load_kr
from salt_forecast.models.engine import HORIZONS, POOL_WEEKS, WalkForward
from salt_forecast.models.kr_stock import (
    KR_BASELINE,
    KR_ENSEMBLE_V1,
    KR_MODELS,
    KR_PRODUCTION,
    KR_RETIRED,
    kr_model_params,
    kr_providers,
)
from salt_forecast.scoring.coverage import TailObs, render_coverage
from salt_forecast.scoring.evaluate import Paired, paired_scores, score_forecast
from salt_forecast.scoring.pooled_gate import (
    kr_cards,
    per_symbol_cards,
    placebo,
    pooled_gate,
    pooled_gates,
    render_placebo,
    render_pooled,
    trim,
)
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
        wf = WalkForward(series, kr_providers(cal, with_retired=True), schedule=cal)
        as_ofs = wf.backtest_as_ofs()
        preds: list[PredictionRow] = []
        scores: list[ScoreRow] = []
        tails: dict[str, list[TailObs]] = {m: [] for m in (*KR_MODELS, *KR_RETIRED)}
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
                lo, hi = e.forecast.interval(90)
                tails[e.model_version].append(TailObs(e.symbol, e.horizon_weeks, e.as_of, lo, hi, e.realized))
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
        universe = sorted({(s, h) for s in series for h in HORIZONS})
        prod_pairs = trim(paired_scores(scores, KR_PRODUCTION, KR_BASELINE, universe, cal.on_grid))
        v1_pairs = trim(paired_scores(scores, KR_ENSEMBLE_V1, KR_BASELINE, universe, cal.on_grid))
        _, verdicts = kr_cards(prod_pairs, KR_PRODUCTION, KR_BASELINE, HORIZONS)

        def count(p: Mapping[tuple[str, int], Paired]) -> int:
            return kr_cards(p, KR_PRODUCTION, KR_BASELINE, HORIZONS)[0]

        def count_old(p: Mapping[tuple[str, int], Paired]) -> int:
            return per_symbol_cards(p, KR_ENSEMBLE_V1, KR_BASELINE)

        sections = [
            *render_pooled(f"풀링 실력 검정 — `{KR_PRODUCTION}`(운영, 위치 0)", verdicts),
            *render_pooled(f"풀링 실력 검정 — `{KR_ENSEMBLE_V1}`(은퇴, 비교용)", pooled_gate(v1_pairs, HORIZONS)),
            *render_placebo(f"상시 플라시보 — `{KR_PRODUCTION}` 풀링 게이트 + 종목 거부권", placebo(prod_pairs, count)),
            *render_placebo(
                f"참고 플라시보 — `{KR_ENSEMBLE_V1}` 옛 종목별 게이트(FC-REQ-009)", placebo(v1_pairs, count_old), None
            ),
            *render_coverage("꼬리별 커버리지", tails, HORIZONS),
        ]
        report = render(
            scores,
            [*KR_MODELS, *KR_RETIRED],
            KR_BASELINE,
            f"국내 주식 워크포워드 백테스트 — 운영 {KR_PRODUCTION}",
            notes,
        ) + "\n".join(["", *sections])
        log.info("백테스트", extra={"fields": {"job": JOB, "predictions": len(preds), "as_ofs": len(as_ofs)}})
        if args.dry_run:
            print(report)
            return len(preds)
        for m in (*KR_MODELS, *KR_RETIRED):
            register_model(eng, m, m.split("@")[0], kr_model_params(m))
        n = write_predictions(eng, preds) + write_scores(eng, scores)
        REPORTS.mkdir(exist_ok=True)
        (REPORTS / f"kr-backtest-{now.date()}.md").write_text(report, encoding="utf-8")
        t_now = int(now.timestamp())
        stale = {s for s, c in series.items() if not cal.fresh(c, t_now, slack=1)}
        rows = pooled_gates(
            scores_for(eng, [KR_PRODUCTION, KR_BASELINE]),
            KR_PRODUCTION,
            KR_BASELINE,
            universe,
            stale,
            cal.on_grid,
            HORIZONS,
        )
        return n + write_gates(eng, rows)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

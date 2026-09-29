"""core 모델 포트폴리오 라이브 원장 — 매일(ops/daily.sh). 사전등록 target-weight@2 [live] (FC-REQ-013).

월요일 봉이 마감하면 5개 목표 비중을 바로 쓰고, 한 주가 지나면 결과를 쓰고, 목표별 요약을 다시 계산한다.
2026-10-05 전에는 쓸 것이 없다(0행). 저장된 원장과 다시 계산한 값이 다르면 실패한다(`LedgerMismatch`).
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs.target_weight import register_prereg
from salt_forecast.jobs.target_weight_v2 import DEFAULT_PREREG
from salt_forecast.scoring.target_weight_live import live_panel, outcome_rows, summaries, weight_rows
from salt_forecast.store import target_weight_live as ledger
from salt_forecast.store.db import engine
from salt_forecast.store.prices import load_ohlcv_series

JOB = "target_weight_live"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("core 모델 포트폴리오 라이브 원장(target-weight@2 [live])")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        now = datetime.now(UTC)
        key, _ = register_prereg(eng, Path(args.prereg), dry_run=args.dry_run, log=log, job=JOB)
        panel = live_panel(load_ohlcv_series(eng, "upbit", "1d"), as_of)
        stored = ledger.load(eng, key)
        weights = weight_rows(panel, as_of)
        new_w = ledger.check_weights(stored, weights)
        recorded = {k: v[1] for k, v in stored.weights.items()} | {(w.target, w.rebalance_at): now for w in new_w}
        outcomes = outcome_rows(panel, weights, recorded, as_of)
        new_o = ledger.check_outcomes(stored, outcomes)
        exposure = {(w.target, w.rebalance_at): w.exposure for w in weights}
        summ = summaries(weights, outcomes, exposure)
        log.info(
            "라이브 원장",
            extra={"fields": {"job": JOB, "weights_new": len(new_w), "outcomes_new": len(new_o),
                              "n_weeks": {s.target: s.summary.n_weeks for s in summ}}},
        )  # fmt: skip
        if args.dry_run:
            return len(new_w) + len(new_o)
        return (
            ledger.write_weights(eng, key, new_w, now)
            + ledger.write_outcomes(eng, key, new_o, now)
            + ledger.write_summaries(eng, key, summ, now)
        )

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

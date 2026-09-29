"""목표 비중 알트 위험 몫 판정 — 사전등록 target-weight@2 를 등록하고 실행해 리포트로 남긴다(FC-REQ-013).

등록은 한 번이다(`target_weight.py` 와 같은 `register`). 판정([alt_share.adopt])은 리포트가 근거다 — 서버는 채택된
a 를 코드 상수로 옮긴다(`targetWeightRecord.ts` `TARGET_WEIGHT_ALT_SHARE`). 채택이 없으면 서버 상수는 `null` 이다.
"""

from __future__ import annotations

from pathlib import Path

from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs.target_weight import ROOT, START, register_prereg
from salt_forecast.scoring.target_weight_v2 import render_report_v2, run_v2
from salt_forecast.store.db import engine
from salt_forecast.store.prices import load_ohlcv_series

JOB = "target_weight_v2"
DEFAULT_PREREG = ROOT / "preregistration" / "2026-09-29-target-weight-v2.toml"
REPORTS = ROOT / "reports"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("목표 비중 알트 위험 몫 판정(사전등록 실행)")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--no-report", action="store_true", help="리포트 파일을 쓰지 않는다")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        key, sha = register_prereg(eng, Path(args.prereg), dry_run=args.dry_run, log=log, job=JOB)
        out = run_v2(load_ohlcv_series(eng, "upbit", "1d"), parse_as_of(START), as_of)
        for r in out.primary():
            log.info(
                "1차",
                extra={"fields": {"job": JOB, "alt_share": r.alt_share, "target": r.target,
                                  "delta_calmar": [round(x, 3) for x in r.delta_calmar],
                                  "delta_mdd": round(r.delta_mdd, 4)}},
            )  # fmt: skip
        log.info("판정", extra={"fields": {"job": JOB, "adopted": out.adopted()}})
        if not args.no_report:
            path = REPORTS / f"target-weight-{key.replace('@', '-')}-{as_of.date().isoformat()}.md"
            path.write_text(render_report_v2(key, sha, as_of, out), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return len(out.records)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

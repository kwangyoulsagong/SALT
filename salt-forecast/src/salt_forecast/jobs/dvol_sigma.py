"""DVOL 기반 σ 채점 — 사전등록 dvol-sigma@1 을 등록하고 실행해 리포트로 남긴다(FC-REQ-014).

등록은 한 번이다. 같은 key 에 다른 내용이 오면 실패한다. 결과는 리포트(커밋)가 근거고, 채택이 있으면
서버 목표 비중 σ 변경은 그 리포트를 근거로 같은 브랜치에서 한다(등록 [decision] adopted).
"""

from __future__ import annotations

from pathlib import Path

from salt_forecast.ingest.deribit import SOURCE
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs.target_weight import register_prereg
from salt_forecast.scoring.dvol_sigma import render_report, run
from salt_forecast.scoring.target_weight import CORE
from salt_forecast.store.db import engine
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.series import load_vintaged

JOB = "dvol_sigma"
ROOT = Path(__file__).resolve().parents[3]
DEFAULT_PREREG = ROOT / "preregistration" / "2026-09-30-dvol-sigma.toml"
REPORTS = ROOT / "reports"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("DVOL 기반 σ 채점(사전등록 실행)")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--no-report", action="store_true", help="리포트 파일을 쓰지 않는다")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        key, sha = register_prereg(eng, Path(args.prereg), dry_run=args.dry_run, log=log, job=JOB)
        out = run(load_ohlcv_series(eng, "upbit", "1d", list(CORE)), load_vintaged(eng, SOURCE), as_of)
        verdicts = {v.candidate: [v.ci_pass, v.halves_pass, v.calmar_pass] for v in out.verdicts}
        window = [str(d) for d in out.window]
        log.info("판정", extra={"fields": {"job": JOB, "adopted": out.adopted, "window": window, "verdicts": verdicts}})
        if not args.no_report:
            path = REPORTS / f"dvol-sigma-{key.replace('@', '-')}-{as_of.date().isoformat()}.md"
            path.write_text(render_report(key, sha, as_of, out), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return len(out.primary)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

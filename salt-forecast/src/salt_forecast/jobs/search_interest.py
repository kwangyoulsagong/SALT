"""검색 관심 채점 — 사전등록 search-interest@1 을 등록하고 실행해 리포트로 남긴다(FC-REQ-017).

판정만 한다. 규칙 · 화면은 바꾸지 않는다 — 근거가 있으면 새 등록으로.
"""

from __future__ import annotations

from pathlib import Path

from salt_forecast.domain.search_interest import KST, SOURCE
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs.target_weight import register_prereg
from salt_forecast.scoring.search_interest import render_report, run
from salt_forecast.store.db import engine
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.series import points_by_series

JOB = "search_interest"
ROOT = Path(__file__).resolve().parents[3]
DEFAULT_PREREG = ROOT / "preregistration" / "2026-10-06-search-interest.toml"
REPORTS = ROOT / "reports"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("검색 관심 채점(사전등록 실행)")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--no-report", action="store_true", help="리포트 파일을 쓰지 않는다")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        key, sha = register_prereg(eng, Path(args.prereg), dry_run=args.dry_run, log=log, job=JOB)
        search = {
            sid: {o.astimezone(KST).date(): v for o, v in pts.items()}
            for sid, pts in points_by_series(eng, SOURCE).items()
        }
        out = run(load_ohlcv_series(eng, "upbit", "1d"), search, as_of)
        fields = {"job": JOB, "h1": out.h1_pass, "h2": out.h2_pass, "weeks": out.weeks, "keywords": out.keywords}
        log.info("판정", extra={"fields": fields})
        if not args.no_report:
            path = REPORTS / f"search-interest-{key.replace('@', '-')}-{as_of.date().isoformat()}.md"
            path.write_text(render_report(key, sha, as_of, out), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return out.weeks

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

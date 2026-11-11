"""조건부 기저율 — 사전등록 base-rate@1 실행(FC-REQ-028 FR-2 · F017 v2 단계 2).

등록 → 국내 · 코인 계산 → forecast.base_rate_stat · base_rate_trigger · 리포트. 매일 장 마감 뒤(국내 일봉 수집 뒤) 돈다.
"""

from __future__ import annotations

import hashlib
import json
import tomllib
from datetime import UTC, date, datetime
from pathlib import Path

from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, stage_logger
from salt_forecast.jobs.rule_ic import REPORTS, ROOT, _git_sha  # pyright: ignore[reportPrivateUsage]
from salt_forecast.scoring.base_rate import MarketRun, render_report, run_crypto, run_kr
from salt_forecast.store.base_rate import save_run
from salt_forecast.store.db import engine
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.rule_ic import Registration, register

JOB = "base_rate"
DEFAULT_PREREG = ROOT / "preregistration" / "2026-11-11-base-rate.toml"
KR_START = "2021-01-01"  # 원천 전 이력(kis 일봉 2021-10 ~) — 봉 수는 여기서부터 센다


def main(argv: list[str] | None = None) -> int:
    p = base_parser("조건부 기저율(사전등록 base-rate@1 실행)")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--market", choices=("kr", "crypto", "all"), default="all")
    p.add_argument("--no-report", action="store_true", help="리포트 파일을 쓰지 않는다")
    args = p.parse_args(argv)
    log = logger(JOB)
    stage = stage_logger(log, JOB)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        raw = Path(args.prereg).read_bytes()
        spec = tomllib.loads(raw.decode())
        key = str(spec["key"])
        registered = spec["registered"]
        reg_at = (
            datetime(registered.year, registered.month, registered.day, tzinfo=UTC)
            if isinstance(registered, date)
            else parse_as_of(str(registered))
        )
        sha = _git_sha()
        if not args.dry_run:
            stored = json.loads(json.dumps(spec, default=str))
            new = register(eng, Registration(key, reg_at, sha, hashlib.sha256(raw).hexdigest(), stored))
            log.info("사전등록", extra={"fields": {"job": JOB, "key": key, "new": new}})

        runs: list[MarketRun] = []
        if args.market in ("kr", "all"):
            runs.append(run_kr(load_ohlcv_series(eng, "kis", "1d"), parse_as_of(KR_START), as_of))
            stage("kr")
        if args.market in ("crypto", "all"):
            runs.append(run_crypto(load_ohlcv_series(eng, "upbit", "1d"), as_of))
            stage("crypto")

        rows = 0
        now = datetime.now(UTC)
        for run in runs:
            ok = sum(1 for s in run.stats if s.stat.status == "ok")
            log.info(
                "시장",
                extra={"fields": {"job": JOB, "market": run.market, "stats": len(run.stats), "ok": ok,
                                  "triggers": len(run.triggers), "universe": round(run.universe_mean)}},
            )  # fmt: skip
            if args.dry_run:
                rows += len(run.stats) + len(run.triggers)
            else:
                rows += save_run(eng, key, as_of, now, run.market, run.window, run.stats, run.triggers)
        if not args.no_report:
            path = REPORTS / f"base-rate-{key.replace('@', '-')}-{as_of.date().isoformat()}.md"
            path.write_text(render_report(key, sha, as_of, runs), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return rows

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

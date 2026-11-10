"""규칙 항목별 IC — 국내 주식(사전등록 rule-ic-kr@1, FC-REQ-028 FR-6). 등록 → 계산 → forecast.rule_ic · 리포트.

코인 `jobs/rule_ic` 와 같은 등록 · 저장 경로를 쓴다(같은 표 · 같은 키 불변 규칙). 다른 것은 원천(kis)과 격자(거래일)뿐.
"""

from __future__ import annotations

import hashlib
import json
import tomllib
from datetime import UTC, date, datetime
from pathlib import Path

from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs.rule_ic import REPORTS, ROOT, _git_sha, _protocol  # pyright: ignore[reportPrivateUsage]
from salt_forecast.scoring.rule_ic_kr import render_kr_report, run_kr
from salt_forecast.store.db import engine
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.rule_ic import Registration, register, save_results

JOB = "rule_ic_kr"
DEFAULT_PREREG = ROOT / "preregistration" / "2026-11-10-rule-ic-kr.toml"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("국내 주식 규칙 항목별 IC 백테스트(사전등록 rule-ic-kr@1 실행)")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--start", default="2021-01-01", help="패널 시작(ISO) — 원천 전 이력(봉 수는 여기서부터 센다)")
    p.add_argument("--no-report", action="store_true", help="리포트 파일을 쓰지 않는다")
    args = p.parse_args(argv)
    log = logger(JOB)

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

        ohlcv = load_ohlcv_series(eng, "kis", "1d")
        out = run_kr(ohlcv, _protocol(spec), parse_as_of(args.start), as_of)
        rows = 0
        for regime, results in out.results.items():
            if args.dry_run:
                rows += len(results)
            else:
                rows += save_results(eng, key, as_of, "backtest", regime, out.window, results)
        for r in out.results["all"]:
            if r.primary:
                log.info(
                    "1차",
                    extra={"fields": {"job": JOB, "item": r.item, "mode": r.mode, "h": r.horizon_days,
                                      "ic": round(r.ic_mean, 4), "ci": [round(r.ci_low, 4), round(r.ci_high, 4)],
                                      "n": r.n_dates, "verdict": r.verdict}},
                )  # fmt: skip
        if not args.no_report:
            path = REPORTS / f"rule-ic-{key.replace('@', '-')}-{as_of.date().isoformat()}.md"
            path.write_text(render_kr_report(key, sha, as_of, out), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return rows

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

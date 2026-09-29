"""목표 비중 안내 규칙 백테스트 — 사전등록 target-weight@1 을 등록하고 실행해 리포트로 남긴다(FC-REQ-012).

등록은 한 번이다. 같은 key 에 다른 내용이 오면 실패한다 — 결과를 보고 규칙 · 문장 조건을 고치지 못하게.
결과는 리포트(커밋)가 근거다. 서버는 이 리포트의 core 1차 값을 코드 상수로 옮긴다(`targetWeightRecord.ts`) —
목표 비중 자체는 서버가 매일 `v_realized_vol.ewma` 로 다시 계산한다(규칙은 같은 식).
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import tomllib
from datetime import UTC, date, datetime
from pathlib import Path

from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.scoring.target_weight import render_report, run
from salt_forecast.store.db import engine
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.rule_ic import Registration, register

JOB = "target_weight"
ROOT = Path(__file__).resolve().parents[3]
DEFAULT_PREREG = ROOT / "preregistration" / "2026-09-29-target-weight.toml"
REPORTS = ROOT / "reports"
START = "2018-01-01"


def _git_sha() -> str:
    try:
        return subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("목표 비중 안내 규칙 백테스트(사전등록 실행)")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
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
        if not isinstance(registered, date):
            raise ValueError("registered 는 TOML 날짜여야 한다")
        reg_at = datetime(registered.year, registered.month, registered.day, tzinfo=UTC)
        sha = _git_sha()
        if not args.dry_run:
            stored = json.loads(json.dumps(spec, default=str))
            new = register(eng, Registration(key, reg_at, sha, hashlib.sha256(raw).hexdigest(), stored))
            log.info("사전등록", extra={"fields": {"job": JOB, "key": key, "new": new}})

        ohlcv = load_ohlcv_series(eng, "upbit", "1d")
        out = run(ohlcv, parse_as_of(START), as_of)
        for r in out.records:
            if r.variant == "weekly":
                log.info(
                    "1차",
                    extra={"fields": {"job": JOB, "universe": r.universe, "target": r.target,
                                      "mdd": round(r.strat.mdd, 4), "cagr": round(r.strat.cagr, 4),
                                      "upside": round(r.strat.upside, 3),
                                      "less_drawdown": r.claim_less_drawdown, "timing": r.claim_timing}},
                )  # fmt: skip
        if not args.no_report:
            path = REPORTS / f"target-weight-{key.replace('@', '-')}-{as_of.date().isoformat()}.md"
            path.write_text(render_report(key, sha, as_of, out), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return len(out.records)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

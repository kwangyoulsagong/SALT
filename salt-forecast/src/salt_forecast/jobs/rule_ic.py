"""규칙 항목별 IC — 사전등록 파일을 등록하고, 백테스트 IC 를 계산해 forecast.rule_ic 와 리포트로 남긴다(FC-REQ-008).

등록은 한 번이다. 같은 key 에 다른 내용이 오면 실패한다 — 결과를 보고 판정 규칙을 고치지 못하게.
"""

from __future__ import annotations

import hashlib
import subprocess
import tomllib
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.scoring.rule_ic import Primary, Protocol, render_report, run
from salt_forecast.store.db import engine
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.rule_ic import Registration, register, save_results
from salt_forecast.store.series import load_vintaged

JOB = "rule_ic"
ROOT = Path(__file__).resolve().parents[3]
DEFAULT_PREREG = ROOT / "preregistration" / "2026-09-27-rule-ic.toml"
REPORTS = ROOT / "reports"


def _protocol(spec: dict[str, Any]) -> Protocol:
    primaries = tuple(
        Primary(str(p["item"]), str(p["mode"]), int(p["horizon_days"]), int(p.get("expected_sign", 1)))
        for p in spec["primary"]
    )
    explore = spec["exploratory"]
    horizons = tuple(sorted({int(h) for h in explore["horizons_days"]} | {p.horizon_days for p in primaries}))
    kinds = tuple(str(k) for k in explore["label_kinds"])
    return Protocol(primaries, horizons, kinds, int(spec["protocol"]["min_dates"]))


def _git_sha() -> str:
    try:
        return subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("규칙 항목별 IC 백테스트(사전등록 실행)")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--start", default="2018-01-01", help="패널 시작(ISO)")
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
            new = register(eng, Registration(key, reg_at, sha, hashlib.sha256(raw).hexdigest(), spec))
            log.info("사전등록", extra={"fields": {"job": JOB, "key": key, "new": new}})

        ohlcv = load_ohlcv_series(eng, "upbit", "1d")
        series = load_vintaged(eng)
        out = run(ohlcv, series, _protocol(spec), parse_as_of(args.start), as_of)
        rows = 0
        for regime, results in out.results.items():
            if not args.dry_run:
                rows += save_results(eng, key, as_of, "backtest", regime, out.window, results)
            else:
                rows += len(results)
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
            path.write_text(render_report(key, sha, as_of, out), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return rows

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

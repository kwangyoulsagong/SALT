"""국면 게이트 백테스트 — 사전등록 regime-gate@1 을 등록하고 실행해 리포트로 남긴다(FC-REQ-009).

등록은 한 번이다. 같은 key 에 다른 내용이 오면 실패한다 — 결과를 보고 판정 규칙을 고치지 못하게.
결과는 리포트(커밋)가 근거다. 서버는 이 결과를 읽지 않는다 — 채택된 게이트는 `market_regime` 작업이 매일 계산한다.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import tomllib
from datetime import UTC, date, datetime
from pathlib import Path

from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.scoring.regime_gate import render_report, run
from salt_forecast.store.db import engine
from salt_forecast.store.events import events_known
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.rule_ic import Registration, register

JOB = "regime_gate"
ROOT = Path(__file__).resolve().parents[3]
DEFAULT_PREREG = ROOT / "preregistration" / "2026-09-29-regime-gate.toml"
REPORTS = ROOT / "reports"
START = "2019-10-01"


def _git_sha() -> str:
    try:
        return subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("국면 게이트 백테스트(사전등록 실행)")
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
        out = run(ohlcv, events_known(eng, as_of), parse_as_of(START), as_of)
        for g in out.gates:
            if g.primary:
                log.info(
                    "1차",
                    extra={"fields": {"job": JOB, "gate": g.gate, "asset": g.asset, "delta_mdd": round(g.delta_mdd, 4),
                                      "ci": [round(g.ci_low, 4), round(g.ci_high, 4)],
                                      "upside": round(g.strat.upside, 3), "passes": g.passes}},
                )  # fmt: skip
        log.info("판정", extra={"fields": {"job": JOB, "adopted": out.adopted}})
        if not args.no_report:
            path = REPORTS / f"regime-gate-{key.replace('@', '-')}-{as_of.date().isoformat()}.md"
            path.write_text(render_report(key, sha, as_of, out), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return len(out.gates)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

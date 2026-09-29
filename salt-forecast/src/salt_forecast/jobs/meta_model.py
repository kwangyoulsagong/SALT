"""메타 모델 · 보정 백테스트 — 사전등록 meta-model@1 을 등록하고 실행해 리포트로 남긴다(FC-REQ-011).

등록은 한 번이다. 같은 key 에 다른 내용이 오면 실패한다 — 결과를 보고 판정 규칙을 고치지 못하게.
결과는 리포트(커밋)가 근거다. 채택되지 않으면 서버 · 화면은 아무것도 바뀌지 않는다.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import time
import tomllib
from datetime import UTC, date, datetime
from pathlib import Path

from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.models.meta import learners
from salt_forecast.scoring.meta_model import rule_ic_fdr, run
from salt_forecast.scoring.meta_report import render_report
from salt_forecast.store.db import engine
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.rule_ic import Registration, latest_backtest, register
from salt_forecast.store.series import load_vintaged

JOB = "meta_model"
ROOT = Path(__file__).resolve().parents[3]
DEFAULT_PREREG = ROOT / "preregistration" / "2026-09-29-meta-model.toml"
REPORTS = ROOT / "reports"
START = "2018-01-01"
RULE_IC_KEY = "rule-ic@1"


def _git_sha() -> str:
    try:
        return subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("메타 모델 · 보정 백테스트(사전등록 실행)")
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
        series = load_vintaged(eng)
        t0 = time.monotonic()

        def step(name: str) -> None:
            log.info("단계", extra={"fields": {"job": JOB, "step": name, "elapsed_s": round(time.monotonic() - t0, 1)}})

        workers = max(1, (os.cpu_count() or 2) - 1)  # performance.md §2
        out = run(ohlcv, series, learners(), parse_as_of(START), as_of, workers, step)
        fdr = rule_ic_fdr(latest_backtest(eng, RULE_IC_KEY))
        c = out.calib
        log.info(
            "판정",
            extra={"fields": {"job": JOB, "selected": out.selected, "signal_gate": out.signal_gate,
                              "shuffle_ok": out.shuffle_ok, "ece": None if c is None else round(c.ece, 4),
                              "bss_ci": None if c is None else [round(c.bss_lo, 4), round(c.bss_hi, 4)],
                              "adopted": out.adopted}},
        )  # fmt: skip
        if not args.no_report:
            path = REPORTS / f"meta-model-{key.replace('@', '-')}-{as_of.date().isoformat()}.md"
            path.write_text(render_report(key, sha, as_of, out, fdr), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return out.n_rows

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

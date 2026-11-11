"""판단 라벨 등급 — 사전등록 judgment-tier@1 실행(FC-REQ-028 FR-6 · F017 v2 단계 4).

등록 → 판단 원장(export 뷰) 읽기 → 칸마다 등급 → forecast.judgment_tier · 리포트.
매일 배치(점검 채점 뒤 — 서버가 그날 판단 원장을 채점한 뒤).
"""

from __future__ import annotations

import hashlib
import json
import tomllib
from datetime import UTC, date, datetime
from pathlib import Path

from salt_forecast.domain.judgment_tier import KEY, RULE_VERSION
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs.rule_ic import REPORTS, ROOT, _git_sha  # pyright: ignore[reportPrivateUsage]
from salt_forecast.scoring.judgment_tier import render_report, run
from salt_forecast.store.db import engine
from salt_forecast.store.judgment_tier import judgment_rows, previous_tiers, save_tiers
from salt_forecast.store.rule_ic import Registration, register

JOB = "judgment_tier"
DEFAULT_PREREG = ROOT / "preregistration" / "2026-11-11-judgment-tier.toml"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("판단 라벨 등급(사전등록 judgment-tier@1 실행)")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--no-report", action="store_true", help="리포트 파일을 쓰지 않는다")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        raw = Path(args.prereg).read_bytes()
        spec = tomllib.loads(raw.decode())
        if spec["key"] != KEY:
            raise ValueError(f"사전등록 키가 코드와 다르다: {spec['key']} != {KEY}")
        registered = spec["registered"]
        reg_at = (
            datetime(registered.year, registered.month, registered.day, tzinfo=UTC)
            if isinstance(registered, date)
            else parse_as_of(str(registered))
        )
        sha = _git_sha()
        if not args.dry_run:
            stored = json.loads(json.dumps(spec, default=str))
            new = register(eng, Registration(KEY, reg_at, sha, hashlib.sha256(raw).hexdigest(), stored))
            log.info("사전등록", extra={"fields": {"job": JOB, "key": KEY, "new": new}})

        rows = judgment_rows(eng, RULE_VERSION, as_of)
        runs = run(rows, previous_tiers(eng, KEY, as_of), as_of)
        for c in runs:
            log.info(
                "칸",
                extra={"fields": {"job": JOB, "market": c.market, "mode": c.mode, "tier": c.row.tier,
                                  "reason": c.row.reason, "live_rows": c.row.live_rows,
                                  "effective_n": round(c.row.live_effective_n)}},
            )  # fmt: skip
        written = (
            len(runs)
            if args.dry_run
            else save_tiers(eng, KEY, RULE_VERSION, as_of, [c.row for c in runs], datetime.now(UTC))
        )
        if not args.no_report:
            path = REPORTS / f"judgment-tier-{KEY.replace('@', '-')}-{as_of.date().isoformat()}.md"
            path.write_text(render_report(KEY, sha, as_of, runs), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return written

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

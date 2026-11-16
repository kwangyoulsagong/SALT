"""원인 설명 채점 — 사전등록 cause-explain@1 실행(FC-REQ-022 FR-15 · F017 v4 순서 5c).

매일(daily.sh, ontology_build 뒤).

등록 → 그날 마지막 원인 스냅샷 × 닫힌 결과(④ outcome) → 칸 넷 → 판정 날짜가 지났으면 그 판정
→ forecast.cause_explain_test · 리포트.
"""

from __future__ import annotations

import hashlib
import json
import tomllib
from datetime import UTC, datetime, timedelta
from pathlib import Path

from salt_forecast.domain.calendar import report_day
from salt_forecast.domain.cause_explain import ALPHA_PER_LOOK, KEY, LOOKS, REGISTERED_AT, judge, look_cutoff, look_due
from salt_forecast.domain.ontology import latest_per_day
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs.rule_ic import REPORTS, ROOT, _git_sha  # pyright: ignore[reportPrivateUsage]
from salt_forecast.scoring.cause_explain import render_report, run
from salt_forecast.store.cause_explain import load_outcomes, previous, save_tests
from salt_forecast.store.db import engine
from salt_forecast.store.ontology import counts, load_snapshots
from salt_forecast.store.rule_ic import Registration, register

JOB = "cause_explain"
DEFAULT_PREREG = ROOT / "preregistration" / "2026-11-16-cause-explain.toml"
_KST = timedelta(hours=9)


def _register(eng: object, path: Path, sha: str) -> bool:
    raw = path.read_bytes()
    spec = tomllib.loads(raw.decode())
    if spec["key"] != KEY:
        raise ValueError(f"사전등록 키가 코드와 다르다: {spec['key']} != {KEY}")
    reg = spec["registered"]
    stored = json.loads(json.dumps(spec, default=str))
    reg_at = datetime(reg.year, reg.month, reg.day, tzinfo=UTC)
    return register(eng, Registration(KEY, reg_at, sha, hashlib.sha256(raw).hexdigest(), stored))  # pyright: ignore[reportArgumentType]


def main(argv: list[str] | None = None) -> int:
    p = base_parser("원인 설명 채점(사전등록 cause-explain@1 — 전진 시험)")
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--no-report", action="store_true", help="리포트 파일을 쓰지 않는다")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        now = datetime.now(UTC)
        sha = _git_sha()
        if not args.dry_run:
            log.info(
                "사전등록", extra={"fields": {"job": JOB, "key": KEY, "new": _register(eng, Path(args.prereg), sha)}}
            )
        days = latest_per_day(load_snapshots(eng, as_of=as_of, since=REGISTERED_AT))
        outs = load_outcomes(eng, as_of=as_of)
        prev = previous(eng, KEY, as_of)
        done = max((n for _, _, n in prev.values()), default=0)
        look = look_due((as_of + _KST).date(), done)
        cells, details = run(days, outs, look_cutoff(look) if look is not None else None)
        if look is not None:
            judge(cells, ALPHA_PER_LOOK, look == len(LOOKS) - 1)
            done = look + 1
            log.info("판정 날짜", extra={"fields": {"job": JOB, "look": look}})
        else:
            for c in cells:
                before = prev.get((c.market, c.horizon))
                if before is not None and before[0] in ("pass", "fail"):
                    c.status, c.reason = before[0], before[1]  # 정해진 판정은 그대로
                else:
                    c.status, c.reason = "forward", ("below_min" if c.below_min else None)
        written = 0 if args.dry_run else save_tests(eng, KEY, as_of, cells, details, done, now)
        for c in cells:
            fields = {"job": JOB, "market": c.market, "h": c.horizon, "status": c.status}
            fields |= {"scored": c.rows_scored, "cold": c.rows_cold, "days": c.days}
            log.info("칸", extra={"fields": fields})
        if not args.no_report:
            path = REPORTS / f"cause-explain-{KEY.replace('@', '-')}-{report_day(as_of)}.md"
            path.write_text(render_report(sha, as_of, cells, details, counts(eng)), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return written if not args.dry_run else len(cells)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

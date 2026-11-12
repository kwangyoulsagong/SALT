"""소식 측정 태그 — 사전등록 news-reaction@1 실행(FC-REQ-028 FR-3 · F017 v2 단계 6).

등록 → 사전을 forecast.news_kind_dict 로(서버가 같은 사전으로 새 제목을 바로 분류)
→ 국내 · 코인 반응 통계 · 선반영 → 리포트.
매일 배치(daily.sh)가 국내 일봉 수집 뒤 돈다.
"""

from __future__ import annotations

import hashlib
import json
import tomllib
from datetime import UTC, date, datetime
from pathlib import Path

from salt_forecast.domain.calendar import report_day
from salt_forecast.domain.news_kind import from_prereg
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, stage_logger
from salt_forecast.jobs.rule_ic import REPORTS, ROOT, _git_sha  # pyright: ignore[reportPrivateUsage]
from salt_forecast.scoring.news_reaction import MarketRun, render_report, run_market
from salt_forecast.store.db import engine
from salt_forecast.store.news_reaction import (
    load_crypto_titles,
    load_kr_titles,
    save_dict,
    save_pre_moves,
    save_stats,
)
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.rule_ic import Registration, register

JOB = "news_reaction"
DEFAULT_PREREG = ROOT / "preregistration" / "2026-11-12-news-reaction.toml"


def server_dict(spec: dict[str, object]) -> dict[str, object]:
    """서버가 읽는 사전 모양 — 사전등록 [classify] · [[kind]] 그대로(낱말은 소문자로)."""
    d = from_prereg(spec)
    return {
        "rules": [
            {
                "id": r.id,
                "text": r.text,
                "markets": list(r.markets),
                "include": list(r.include),
                "exclude": list(r.exclude),
            }
            for r in d.rules
        ],
        "exclude": {m: list(w) for m, w in d.exclude.items()},
        "news_max_codes": d.news_max_codes,
    }


def main(argv: list[str] | None = None) -> int:
    p = base_parser("소식 측정 태그(사전등록 news-reaction@1 실행)")
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
        if not isinstance(registered, date):
            raise ValueError("registered 는 날짜")
        reg_at = datetime(registered.year, registered.month, registered.day, tzinfo=UTC)
        d = from_prereg(spec)
        sha = _git_sha()
        now = datetime.now(UTC)
        rows = 0
        if not args.dry_run:
            stored = json.loads(json.dumps(spec, default=str))
            new = register(eng, Registration(key, reg_at, sha, hashlib.sha256(raw).hexdigest(), stored))
            log.info("사전등록", extra={"fields": {"job": JOB, "key": key, "new": new}})
            rows += save_dict(eng, key, registered, server_dict(spec), now)

        runs: list[MarketRun] = []
        if args.market in ("kr", "all"):
            runs.append(
                run_market("kr", load_kr_titles(eng, as_of=as_of), load_ohlcv_series(eng, "kis", "1d"), d, as_of)
            )
            stage("kr")
        if args.market in ("crypto", "all"):
            bars = load_ohlcv_series(eng, "upbit", "1d")
            runs.append(run_market("crypto", load_crypto_titles(eng, as_of=as_of), bars, d, as_of))
            stage("crypto")

        for run in runs:
            ok = sum(1 for s in run.stats if s.status == "ok")
            log.info(
                "시장",
                extra={"fields": {"job": JOB, "market": run.market, "titles": run.titles, "events": run.events,
                                  "stats": len(run.stats), "ok": ok, "pre_moves": len(run.pre_moves)}},
            )  # fmt: skip
            if args.dry_run:
                rows += len(run.stats) + len(run.pre_moves)
            else:
                rows += save_stats(eng, key, as_of, run.stats)
                rows += save_pre_moves(eng, run.market, run.pre_moves, now)
        if not args.no_report:
            path = REPORTS / f"news-reaction-{key.replace('@', '-')}-{report_day(as_of)}.md"
            path.write_text(render_report(key, sha, as_of, runs, d), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return rows

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

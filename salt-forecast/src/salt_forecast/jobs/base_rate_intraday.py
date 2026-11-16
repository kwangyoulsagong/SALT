"""장중 조건부 기저율 — 사전등록 base-rate@3 실행(FC-REQ-028 FR-7 · F017 v4 순서 3).

두 모드:
- `stats` — 하루 한 번(daily.sh). 등록 → 코인 · 국내 5분봉 전 구간 서술
  → forecast.base_rate_stat(horizon_unit hour) · 리포트.
  옛 문턱은 지운다 — 뷰는 최신 통계 as_of 의 문턱만 본다
- `live` — 5분마다(intraday.sh). 최근 22일 5분봉만 읽어 마지막 칸 문턱을 마지막 통계 as_of 로 통째로 바꾼다
"""

from __future__ import annotations

import hashlib
import json
import tomllib
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from salt_forecast.domain.calendar import report_day
from salt_forecast.domain.series import OhlcvSeries
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, stage_logger
from salt_forecast.jobs.rule_ic import REPORTS, ROOT, _git_sha  # pyright: ignore[reportPrivateUsage]
from salt_forecast.scoring import base_rate_intraday as bri
from salt_forecast.scoring.base_rate import MarketRun
from salt_forecast.store.base_rate import latest_stat_as_of, replace_triggers, save_run
from salt_forecast.store.db import engine
from salt_forecast.store.events import events_known
from salt_forecast.store.kr_stock import kr_static_vi
from salt_forecast.store.prices import available_span, load_ohlcv_window
from salt_forecast.store.rule_ic import Registration, register

JOB = "base_rate_intraday"
DEFAULT_PREREG = ROOT / "preregistration" / "2026-11-16-base-rate-intraday.toml"
LIVE_DAYS = bri.KR_PAD_BEFORE_DAYS + 1


def main(argv: list[str] | None = None) -> int:
    p = base_parser("장중 조건부 기저율(사전등록 base-rate@3 실행)")
    p.add_argument("mode", choices=("stats", "live"))
    p.add_argument("--prereg", default=str(DEFAULT_PREREG), help="사전등록 TOML")
    p.add_argument("--market", choices=("kr", "crypto", "all"), default="all")
    p.add_argument("--no-report", action="store_true", help="리포트 파일을 쓰지 않는다")
    args = p.parse_args(argv)
    job = f"{JOB}_{args.mode}"
    log = logger(job)
    stage = stage_logger(log, job)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        raw = Path(args.prereg).read_bytes()
        spec = tomllib.loads(raw.decode())
        key = str(spec["key"])
        if key != bri.KEY:
            raise ValueError(f"사전등록 키가 코드와 다르다: {key} != {bri.KEY}")
        macro = [e.event_at for e in events_known(eng, as_of) if e.symbol == "" and e.kind in bri.MACRO_KINDS]
        markets = ("kr", "crypto") if args.market == "all" else (args.market,)

        def load(source: str) -> bri.Loader:
            """구간 로더 — scoring 은 store 를 모른다."""

            def read(lo: datetime, hi: datetime) -> dict[str, OhlcvSeries]:
                return load_ohlcv_window(eng, source, "5m", lo, hi)

            return read

        if args.mode == "live":
            rows = 0
            for market in markets:
                stats_at = latest_stat_as_of(eng, key, market)
                if stats_at is None:
                    log.info("통계 실행 전 — 문턱 건너뜀", extra={"fields": {"job": job, "market": market}})
                    continue
                lo, hi = as_of - timedelta(days=LIVE_DAYS), as_of
                if market == "crypto":
                    triggers = bri.crypto_live(load_ohlcv_window(eng, "upbit", "5m", lo, hi), as_of, macro)
                else:
                    vi = kr_static_vi(eng, lo, as_of)
                    triggers = bri.kr_live(load_ohlcv_window(eng, "kis", "5m", lo, hi), as_of, vi)
                closed = sum(1 for t in triggers if t.applies_to == "closed")
                fields = {"job": job, "market": market, "next": len(triggers) - closed, "closed": closed}
                log.info("문턱", extra={"fields": fields})
                if not args.dry_run:
                    rows += replace_triggers(eng, key, market, stats_at, triggers)
                else:
                    rows += len(triggers)
            return rows

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
            log.info("사전등록", extra={"fields": {"job": job, "key": key, "new": new}})

        runs: list[MarketRun] = []
        for market in markets:
            source = "kis" if market == "kr" else "upbit"
            span = available_span(eng, source, "5m")
            if span is None:
                log.info("5분봉 없음", extra={"fields": {"job": job, "market": market}})
                continue
            if market == "kr":
                vi = kr_static_vi(eng, span[0], as_of)
                runs.append(bri.run_kr(load(source), span[0], as_of, vi))
            else:
                runs.append(bri.run_crypto(load(source), span[0], as_of, macro))
            stage(market)

        rows = 0
        now = datetime.now(UTC)
        for run in runs:
            ok = sum(1 for s in run.stats if s.stat.status == "ok")
            fields = {"job": job, "market": run.market, "stats": len(run.stats), "ok": ok, "rows": run.rows}
            log.info("시장", extra={"fields": fields})
            if args.dry_run:
                rows += len(run.stats)
            else:
                rows += save_run(
                    eng, key, as_of, now, run.market, run.window, run.stats, [],
                    horizon_unit="hour", keep_triggers_since=as_of,
                )  # fmt: skip
        if not args.no_report and runs:
            path = REPORTS / f"base-rate-{key.replace('@', '-')}-{report_day(as_of)}.md"
            path.write_text(bri.render_report(sha, as_of, runs), encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": job, "path": str(path)}})
        return rows

    return run_job(job, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

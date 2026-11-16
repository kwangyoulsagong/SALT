"""온톨로지 적재(FC-REQ-022 FR-5 · 6 · 13 · 14 · F017 v4 순서 5b) — 매일(daily.sh).

종목 마스터 · 업비트 심볼 → 자산 · 업종 · 소속 / 서버 원인 스냅샷 → 사건 · 영향 · 등락 사실 · 근거 ·
원인 후보 / 일봉 → 결과.
"""

from __future__ import annotations

from dataclasses import asdict

from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.ontology.build import build_ontology
from salt_forecast.store.db import engine

JOB = "ontology_build"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("온톨로지 네 층 적재(사실 → 근거 → 원인 후보 → 결과)")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        res, graph, outs = build_ontology(engine(), parse_as_of(args.as_of), dry_run=args.dry_run)
        log.info("적재", extra={"fields": {"job": JOB, "dry_run": args.dry_run, **asdict(res)}})
        if args.dry_run:
            for c in graph.candidates[:3]:
                log.info(
                    "원인 후보 샘플",
                    extra={
                        "fields": {
                            "entity": c.entity,
                            "date": str(c.trade_date),
                            "kind": c.kind,
                            "strength": c.strength,
                            "supports": c.supports,
                        }
                    },
                )
            for o in outs[:3]:
                log.info(
                    "결과 샘플",
                    extra={
                        "fields": {
                            "entity": o.entity,
                            "date": str(o.trade_date),
                            "h": o.horizon,
                            "excess": round(o.excess, 5),
                        }
                    },
                )
        return res.entities + res.relations + res.facts + res.candidates + res.evidence + res.outcomes

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

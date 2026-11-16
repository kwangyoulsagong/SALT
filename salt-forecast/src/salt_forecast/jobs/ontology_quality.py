"""온톨로지 식별자 해소 품질 — 제목 → 종목 정밀도 · 재현율 · 이름 충돌(FC-REQ-022 FR-10~12). 주 1회 ·
해소 규칙을 바꿀 때.

라벨 `reports/o2-labels-2026-11-16.tsv`(문서 id · 정답 — 제목 원문 0 ·
라벨러 Claude, 사람 검수 전)를 지금 해소 규칙으로 다시 채점한다.
tune = 규칙을 고른 표본 · holdout = 규칙을 고른 뒤 처음 본 표본(판정은 holdout).
"""

from __future__ import annotations

import math
from pathlib import Path

from salt_forecast.domain.calendar import report_day
from salt_forecast.domain.ontology_sources import (
    LINK_THRESHOLD,
    O2_PRECISION,
    O2_RECALL,
    LinkScore,
    coin_name_index,
    kr_name_index,
    mine_cooccurring_words,
    name_collisions,
    resolve_mentions,
    score_links,
    with_ambiguous,
)
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs.rule_ic import REPORTS, ROOT
from salt_forecast.store.db import engine
from salt_forecast.store.ontology import load_crypto_names, load_label_titles, load_master, load_titles

JOB = "ontology_quality"
LABELS = ROOT / "reports" / "o2-labels-2026-11-16.tsv"


def _fmt(s: LinkScore) -> str:
    p, r = s.precision, s.recall
    return f"{p:.3f} | {r:.3f} | {s.tp} · {s.fp} · {s.fn}" if not math.isnan(p) else "— | — | 0"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("온톨로지 식별자 해소 품질(O2)")
    p.add_argument("--labels", default=str(LABELS))
    p.add_argument("--no-report", action="store_true")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        text_rows = Path(args.labels).read_text(encoding="utf-8").splitlines()[1:]
        rows = [line.rstrip("\n").split("\t") for line in text_rows]
        labels = [
            (r[0], r[1], set(filter(None, r[2].split(",")))) for r in rows if (r[3] if len(r) > 3 else "") != "skip"
        ]
        texts = load_label_titles(eng, [d for _, d, _ in labels])
        titles = load_titles(eng, as_of=as_of)
        kr_titles = [(t.title, t.codes) for t in titles if t.origin != "crypto"]
        base = kr_name_index([(m.code, m.name) for m in load_master(eng)], mine_cooccurring_words(kr_titles))
        kr_idx = with_ambiguous(base, kr_titles)
        coins = load_crypto_names(eng)
        coin_idx = coin_name_index([(c.symbol, c.korean_name, c.english_name) for c in coins])
        table: dict[tuple[str, str, str], list[tuple[set[str], set[str]]]] = {}
        missing = 0
        for split, doc, gold in labels:
            if doc not in texts:
                missing += 1
                continue
            title, src = texts[doc]
            market = "crypto" if doc.startswith("document:crypto-news:") else "kr"
            idx = coin_idx if market == "crypto" else kr_idx
            src_keys = {s.removeprefix("KRW-").upper() if market == "crypto" else s for s in src}
            got = resolve_mentions(title, src, idx, market=market)
            resolved = {k for k, c in got.items() if c >= LINK_THRESHOLD}
            table.setdefault((split, market, "source"), []).append((src_keys, gold))
            table.setdefault((split, market, "resolved"), []).append((resolved, gold))
        scores = {k: score_links(v) for k, v in table.items()}
        held = {m: scores[("holdout", m, "resolved")] for m in ("kr", "crypto") if ("holdout", m, "resolved") in scores}
        gate = {m: s.precision >= O2_PRECISION and s.recall >= O2_RECALL for m, s in held.items()}
        collisions = name_collisions(kr_titles, base)
        coin_in_kr = name_collisions([(t, ()) for t, _ in kr_titles], coin_idx)
        for (split, m, v), s in sorted(scores.items()):
            fields = {"job": JOB, "set": split, "market": m, "variant": v}
            log.info(
                "O2", extra={"fields": fields | {"precision": round(s.precision, 3), "recall": round(s.recall, 3)}}
            )
        log.info(
            "관문",
            extra={"fields": {"job": JOB, **{f"mentions_ok_{m}": ok for m, ok in gate.items()}, "missing": missing}},
        )
        if not args.no_report:
            lines = [
                f"# 온톨로지 식별자 해소 품질(O2) — {as_of.date().isoformat()}",
                "",
                f"라벨 `{Path(args.labels).name}` — 문서 {len(labels)}건(사람 검수 전 · 라벨러 Claude). "
                f"기준 정밀도 ≥ {O2_PRECISION} · 재현율 ≥ {O2_RECALL}(FR-11). 판정은 holdout. "
                f"원천에서 사라진 문서 {missing}.",
                "",
                "| 표본 | 시장 | 연결 | 정밀도 | 재현율 | 맞음 · 틀린 연결 · 놓침 |",
                "|---|---|---|---|---|---|",
                *[f"| {k[0]} | {k[1]} | {k[2]} | {_fmt(s)} |" for k, s in sorted(scores.items())],
                "",
                "관문(holdout 해소 뒤): " + " · ".join(f"{m} {'통과' if ok else '미달'}" for m, ok in gate.items()),
                "",
                "## 이름 충돌(FR-12) — 제목에 자주 나오는데 원천이 거의 안 붙인 국내 종목명(일반어 · 동명 의심)",
                "",
                "| 이름 | 코드 | 나온 제목 | 원천이 붙인 비율 |",
                "|---|---|---|---|",
                *[f"| {n} | {k} | {a} | {r:.0%} |" for n, k, a, r in collisions[:40]],
                "",
                "## 코인 이름이 국내 소식 제목에 나온 수(일반어 의심 — 코인 기사가 아닌데 이름이 잡힘)",
                "",
                "| 이름 | 심볼 | 국내 제목 |",
                "|---|---|---|",
                *[f"| {n} | {k} | {a} |" for n, k, a, _ in coin_in_kr[:40]],
            ]
            path = REPORTS / f"ontology-quality-{report_day(as_of)}.md"
            path.write_text("\n".join(lines) + "\n", encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return len(labels)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

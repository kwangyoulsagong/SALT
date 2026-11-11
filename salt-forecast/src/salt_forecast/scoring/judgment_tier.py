"""판단 라벨 등급 실행 — 칸(시장 × 모드)마다 측정 → Holm → 결정(사전등록 judgment-tier@1 · FC-REQ-028 FR-6)."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime

from salt_forecast.domain.judgment_tier import (
    DEMOTION_WINDOW,
    EMPTY,
    MARKETS,
    MODES,
    CellStat,
    Previous,
    Row,
    decide,
    halves,
    holm,
    measure,
)
from salt_forecast.store.judgment_tier import TierRow


@dataclass(frozen=True, slots=True)
class CellRun:
    market: str
    mode: str
    by_origin: dict[str, CellStat]  # live · backtest_full · backtest_price_only(리포트만)
    promote: CellStat
    p_holm: float | None
    regimes: tuple[float | None, float | None]
    row: TierRow


def run(
    rows: Mapping[tuple[str, str, str], Sequence[Row]],
    previous: Mapping[tuple[str, str], Previous],
    now: datetime,
) -> list[CellRun]:
    cells = [(m, md) for m in MARKETS for md in MODES]
    measured: dict[tuple[str, str], dict[str, CellStat]] = {}
    promote_rows: dict[tuple[str, str], list[Row]] = {}
    promote_stat: dict[tuple[str, str], CellStat] = {}
    for m, md in cells:
        measured[(m, md)] = {
            o: measure(rows.get((m, md, o), ()), m) for o in ("live", "backtest_full", "backtest_price_only")
        }
        prev = previous.get((m, md))
        live = list(rows.get((m, md, "live"), ()))
        since = prev.demoted_at if prev else None
        mine = [r for r in live if since is None or r.judged_at > since]
        promote_rows[(m, md)] = mine
        promote_stat[(m, md)] = measured[(m, md)]["live"] if since is None else measure(mine, m)

    # Holm 가족 = spread 가 정의된 라이브 칸(승격에 세는 행 기준)
    family = [c for c in cells if promote_stat[c].p is not None]
    adjusted = dict(zip(family, holm([promote_stat[c].p or 1.0 for c in family]), strict=True))

    out: list[CellRun] = []
    for m, md in cells:
        stats = measured[(m, md)]
        live_all = list(rows.get((m, md, "live"), ()))
        recent = measure([r for r in live_all if r.judged_at > now - DEMOTION_WINDOW], m)
        regimes = halves(promote_rows[(m, md)], m)
        p_holm = adjusted.get((m, md))
        d = decide(
            live=stats["live"],
            promote=promote_stat[(m, md)],
            promote_p_holm=p_holm,
            regimes=regimes,
            backtest_full=stats["backtest_full"] if stats["backtest_full"] is not EMPTY else None,
            recent=recent,
            previous=previous.get((m, md)),
            now=now,
        )
        live = stats["live"]
        bt = stats["backtest_full"]
        out.append(
            CellRun(
                m,
                md,
                stats,
                promote_stat[(m, md)],
                p_holm,
                regimes,
                TierRow(
                    market=m,
                    mode=md,
                    tier=d.tier,
                    reason=d.reason,
                    basis_source=d.basis_source,
                    live_rows=live.rows,
                    live_days=live.days,
                    live_candidates=live.candidates,
                    live_avoids=live.avoids,
                    live_effective_n=live.effective_n,
                    live_spread=live.spread,
                    live_ci_low=live.ci_low,
                    live_ci_high=live.ci_high,
                    live_p_holm=p_holm,
                    regime_first=regimes[0],
                    regime_second=regimes[1],
                    backtest_spread=bt.spread,
                    backtest_ci_low=bt.ci_low,
                    backtest_ci_high=bt.ci_high,
                    demoted_at=d.demoted_at,
                ),
            )
        )
    return out


def _f(x: float | None, pct: bool = True) -> str:
    if x is None:
        return "—"
    return f"{x * 100:+.2f}%" if pct else f"{x:.3f}"


def render_report(key: str, sha: str, as_of: datetime, runs: Sequence[CellRun]) -> str:
    lines = [
        f"# 판단 라벨 등급 — {key} · {as_of.date().isoformat()}",
        "",
        "사전등록 `salt-forecast/preregistration/2026-11-11-judgment-tier.toml` 그대로 돌린 결과"
        f"(git `{sha}`). 규칙 `mode-decision@2` 행만.",
        "spread = 후보 초과 순수익 − 피하기 초과(같은 날 같은 칸 동일가중 대비)"
        " · 95% CI = 날짜 군집 부트스트랩 2,000회.",
        "`backtest_price_only` 는 등급 근거가 아니다(보고만). 과거 검산은 '검증됨'을 만들지 않는다.",
        "",
        "## 등급",
        "",
        "| 시장 | 모드 | 등급 | 이유 | 정한 출처 | 라이브 유효 n / 620 | Holm p | 두 반 spread |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for c in runs:
        r = c.row
        lines.append(
            f"| {c.market} | {c.mode} | {r.tier} | {r.reason or '—'} | {r.basis_source or '—'} | "
            f"{r.live_effective_n:.0f} | {_f(c.p_holm, pct=False)} | {_f(c.regimes[0])} · {_f(c.regimes[1])} |"
        )
    lines += [
        "",
        "## 칸 × 출처",
        "",
        "| 시장 | 모드 | 출처 | 행 | 날 | 후보 | 피하기 | 유효 n | spread | 95% CI | 단측 p | 버린 회차 |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for c in runs:
        for origin, s in c.by_origin.items():
            ci = "—" if s.ci_low is None else f"[{_f(s.ci_low)}, {_f(s.ci_high)}]"
            lines.append(
                f"| {c.market} | {c.mode} | {origin} | {s.rows} | {s.days} | {s.candidates} | {s.avoids} | "
                f"{s.effective_n:.0f} | {_f(s.spread)} | {ci} | {_f(s.p, pct=False)} | {s.discarded} |"
            )
    lines += [
        "",
        "후보가 0 건인 칸은 spread 가 없다(`no_candidate`) —"
        " mode-decision@2 는 등록 시점까지 후보 판단을 낸 적이 없다(사전등록에 미리 적음).",
        "표본 선택: 서버가 지금 모으는 종목만(생존 편향 — signal-skill@1 리포트와 같다).",
    ]
    return "\n".join(lines) + "\n"

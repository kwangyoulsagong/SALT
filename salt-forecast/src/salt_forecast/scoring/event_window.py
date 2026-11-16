"""사건 반응 창 · 선반영 삼분위 실행 — 사전등록 `event-window@2`(FC-REQ-028 FR-8 · F017 v4 순서 3b).

제목 · 공시 → 사건 종류(news-reaction@2 사전) → 사건(기준 봉 · 쿨다운)
→ 창(-20 · -5 · -1 · +30분 · +1 · +5) → 삼분위 서술.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime

from salt_forecast.domain.event_window import EventRow, WindowStat, describe, pick_events, windows
from salt_forecast.domain.kr_market_proxy import equal_weight_index
from salt_forecast.domain.news_kind import Dictionary, classify
from salt_forecast.domain.news_reaction import Aligned, Title, align, crypto_index
from salt_forecast.domain.series import OhlcvSeries
from salt_forecast.store.news_reaction import RawTitle


@dataclass(frozen=True, slots=True)
class MarketRun:
    market: str
    events: int
    rows: list[EventRow]
    stats: list[WindowStat]


def _key(market: str, code: str) -> str:
    return code if market == "kr" else f"KRW-{code}"


def run_market(
    market: str,
    raw: Sequence[RawTitle],
    bars: Mapping[str, OhlcvSeries],
    minutes: Mapping[str, OhlcvSeries],
    d: Dictionary,
    as_of: datetime,
) -> MarketRun:
    t = int(as_of.timestamp())
    cut = {s: b.as_of(t) for s, b in bars.items()}
    cut = {s: b for s, b in cut.items() if b.available_at.size > 0}
    index = equal_weight_index(cut) if market == "kr" else crypto_index(cut)
    aligned: dict[str, Aligned] = {s: align(b, index, kr_breaks=market == "kr") for s, b in cut.items()}
    mins = {s: m.as_of(t) for s, m in minutes.items()}

    titles: list[Title] = []
    for r in raw:
        if r.published_at > as_of:
            continue
        keys = [k for k in (_key(market, c) for c in r.codes) if k in aligned]
        if not keys:
            continue
        # 공시(DART)도 news-reaction@2 사전의 disclosure 규칙으로 — 출처 이름만 dart
        kind = classify(d, market, "disclosure" if r.origin == "dart" else r.origin, len(keys), r.title)
        titles += [Title(r.origin, kind, k, r.published_at) for k in keys]

    picked = pick_events(titles, aligned)
    rows = windows(picked, aligned, mins, t)
    tagged, stats = describe(market, rows)
    return MarketRun(market, len(picked), tagged, stats)


def _pct(x: float | None) -> str:
    return "—" if x is None else f"{x * 100:+.2f}%"


def _rate(x: float | None) -> str:
    return "—" if x is None else f"{x * 100:.1f}%"


def render_report(key: str, git_sha: str, as_of: datetime, runs: Sequence[MarketRun]) -> str:
    lines = [
        f"# 사건 반응 창 · 선반영 삼분위 — `{key}` ({as_of.date().isoformat()})",
        "",
        f"- 사전등록 `preregistration/2026-11-16-event-window-2.toml` · 코드 `{git_sha}` · as_of {as_of.isoformat()}",
        "- 초과 = 종목 로그수익 − 시장(국내 KR-EW · 코인 업비트 동일가중). 기준 봉 = 게시 전 마지막 일봉 · 쿨다운 5봉",
        "- 삼분위 = 출처마다 발표 전 5봉 초과 등락 33% · 67% 분위. 문턱 유효 n ≥ 30 · 서로 다른 날 ≥ 20",
        "- '종류 전체와 다름'은 Holm(시장 · 지평 가족) α 0.05 통과 + 부호일 때만",
        "",
    ]
    for run in runs:
        title = "국내 주식" if run.market == "kr" else "코인"
        ok = sum(1 for s in run.stats if s.status == "ok")
        lines += [
            f"## {title} — 사건 {run.events} · 서술 {len(run.stats)}행(ok {ok})",
            "",
            "| 출처 | 종류 | 삼분위 | h | 상태 | 사건 | 유효 n | 날 | 오른 비율 | 평균"
            " | q10 · q50 · q90 | 선반영 중앙 | 전체 대비 |",
            "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
        ]
        for s in run.stats:
            q = "—" if s.q10 is None else f"{_pct(s.q10)} · {_pct(s.q50)} · {_pct(s.q90)}"
            ph = "" if s.p_holm is None else f" (p {s.p_holm:.3f})"
            lines.append(
                f"| {s.origin} | {s.kind} | {s.tercile} | {s.horizon} | {s.status} | {s.sample} | {s.sample_eff:.0f} | "
                f"{s.sample_days} | {_rate(s.up_rate)} | {_pct(s.mean)} | {q} | {_pct(s.pre5_median)} | "
                f"{s.differs or '—'}{ph} |"
            )
        lines.append("")
    lines += [
        "## 한계",
        "",
        "- 국내 제목 이력은 서버 1년 백필이 끝나야 찬다(새 맥 2026-11-16 — 첫 실행은 이틀치)."
        " 공시(DART)는 유니버스 · 1년",
        "- DART 게시 시각 = min(서버가 처음 본 시각, 접수일 23:59:59 KST) — 백필분은 접수일 끝"
        "(보수적 — 그날 반응은 post1 에 들지 않는다)",
        "- +30분은 5분봉이 있는 종목(국내 유니버스 · 코인 2024-11 ~)만 — 서술 표엔 1 · 5봉만 싣는다",
    ]
    return "\n".join(lines) + "\n"

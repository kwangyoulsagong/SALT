"""소식 측정 태그 실행 — 사전등록 `news-reaction@1`(FC-REQ-028 FR-3 · F017 단계 6).

제목 → 사건 종류(사전) → 사건(기준 봉 · 쿨다운) → (출처, 종류, 지평) 서술 + 종목 봉마다 선반영.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime

from salt_forecast.domain.kr_market_proxy import equal_weight_index
from salt_forecast.domain.news_kind import Dictionary, classify
from salt_forecast.domain.news_reaction import (
    HORIZONS,
    Aligned,
    PreMove,
    ReactionStat,
    Title,
    align,
    baseline_up_rate,
    crypto_index,
    describe,
    events,
    recent_pre_moves,
)
from salt_forecast.domain.series import OhlcvSeries
from salt_forecast.store.news_reaction import RawTitle

PRE_MOVE_KEEP = 15  # 종목마다 최근 봉 수 — 서버는 제목 게시 전 마지막 봉을 고른다(맥이 며칠 자도 남게)


@dataclass(frozen=True, slots=True)
class MarketRun:
    market: str
    titles: int  # 읽은 제목 × 종목(시계열 있는 것)
    classified: Counter[str]  # 종류 → 제목 × 종목 수(other 포함)
    events: int
    stats: list[ReactionStat]
    pre_moves: list[PreMove]  # symbol = 서버 키


def _crypto_key(sym: str) -> str:
    return f"KRW-{sym}"


def run_market(
    market: str,
    raw: Sequence[RawTitle],
    bars: Mapping[str, OhlcvSeries],
    d: Dictionary,
    as_of: datetime,
) -> MarketRun:
    t = int(as_of.timestamp())
    cut = {s: b.as_of(t) for s, b in bars.items()}
    cut = {s: b for s, b in cut.items() if b.available_at.size > 0}
    index = equal_weight_index(cut) if market == "kr" else crypto_index(cut)
    aligned: dict[str, Aligned] = {s: align(b, index, kr_breaks=market == "kr") for s, b in cut.items()}

    titles: list[Title] = []
    kinds: Counter[str] = Counter()
    for r in raw:
        if r.published_at > as_of:  # 읽는 쪽이 이미 거르지만 여기서도 — 미래 제목이 사건 수 · 쿨다운에 들지 않게
            continue
        keys = [c if market == "kr" else _crypto_key(c) for c in r.codes]
        # 코인 심볼 태깅의 잡음(BIT · CEO …)은 가격 시계열이 없으므로 여기서 빠진다 — 관련 종목 수도 남은 것으로 센다
        keys = [k for k in keys if k in aligned] if market == "crypto" else keys
        if not keys:
            continue
        kind = classify(d, market, r.origin, len(keys), r.title)
        for k in keys:
            if k not in aligned:
                continue
            kinds[kind] += 1
            titles.append(Title(r.origin, kind, k, r.published_at))

    evs = events(titles, aligned)
    base = {h: baseline_up_rate(aligned, h, t) for h in HORIZONS}
    stats = describe(market, evs, aligned, t, base)
    pre: list[PreMove] = []
    for s, a in aligned.items():
        server_key = s if market == "kr" else s.removeprefix("KRW-")
        pre += [PreMove(server_key, p.bar_at, p.pre_move_5d) for p in recent_pre_moves(a, t, PRE_MOVE_KEEP)]
    return MarketRun(market, sum(kinds.values()), kinds, len(evs), stats, pre)


def _pct(x: float | None) -> str:
    return "—" if x is None else f"{x * 100:+.2f}%"


def _rate(x: float | None) -> str:
    return "—" if x is None else f"{x * 100:.1f}%"


LABEL = {"higher": "보통 올랐던 소식", "lower": "보통 내렸던 소식"}


def render_report(key: str, git_sha: str, as_of: datetime, runs: Sequence[MarketRun], d: Dictionary) -> str:
    text = {r.id: r.text for r in d.rules}
    lines = [
        f"# 소식 측정 태그 — `{key}` ({as_of.date().isoformat()})",
        "",
        f"- 사전등록 `preregistration/2026-11-12-news-reaction.toml` · 코드 `{git_sha}` · as_of {as_of.isoformat()}",
        "- 초과 반응 = 종목 로그수익 − 시장 대용(국내 KR-EW · 코인 업비트 원화 동일가중) 로그수익,"
        " 기준 = 게시 전 마지막 일봉 종가",
        "- 장중 기사는 기준이 전 거래일 종가라 기사 전 장중 움직임이 1봉 반응에 섞인다(근사)",
        "- 유효 n = 같은 날 몰림(ICC) 보정 · 문턱 유효 n ≥ 30 · 서로 다른 날 ≥ 20,"
        " 못 넘으면 `below_min`(숫자 없음 — 화면 '같은 종류 n건뿐')",
        "- 칩 = 1봉: Holm(시장 × 지평 가족) α 0.05 통과 + 부호 → 보통 올랐던 · 보통 내렸던,"
        " 못 넘음 → 반응 엇갈림. 호재 · 악재 단어 0",
        "- 표본 선택: 국내 = 원천 관련 종목 중 kis 일봉이 있는 종목(폐지 포함 — 원천에 남은 만큼)"
        " · 코인 = 심볼 태깅 중 업비트 일봉이 있는 것",
        "",
    ]
    for run in runs:
        title = "국내 주식" if run.market == "kr" else "코인"
        cls = " · ".join(f"{text.get(k, k)} {n}" for k, n in run.classified.most_common())
        lines += [
            f"## {title} — 제목 × 종목 {run.titles}건 · 사건 {run.events}건 · 선반영 {len(run.pre_moves)}행",
            "",
            f"분류: {cls or '없음'}",
            "",
            "| 출처 | 종류 | h | 상태 | 사건 | 유효 n | 날 | 오른 비율 | 95% | 평소 | 평균"
            " | q10 · q50 · q90 | 선반영 중앙 | 칩 |",
            "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
        ]
        for s in run.stats:
            band = "—" if s.up_low is None else f"{_rate(s.up_low)} ~ {_rate(s.up_high)}"
            q = "—" if s.q10 is None else f"{_pct(s.q10)} · {_pct(s.q50)} · {_pct(s.q90)}"
            chip = f"같은 종류 {s.sample}건뿐" if s.status == "below_min" else LABEL.get(s.differs or "", "반응 엇갈림")
            origin = "공시" if s.origin == "disclosure" else "뉴스"
            lines.append(
                f"| {origin} | {text.get(s.kind, s.kind)} | {s.horizon} | {s.status}"
                f" | {s.sample} | {s.sample_eff:.0f} | {s.sample_days} | {_rate(s.up_rate)} | {band}"
                f" | {_rate(s.base_up_rate)} | {_pct(s.mean)} | {q} | {_pct(s.pre_move_median)} | {chip} |"
            )
        lines.append("")
    return "\n".join(lines) + "\n"

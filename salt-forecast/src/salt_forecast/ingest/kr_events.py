"""국내 시장 일정 — FC-REQ-021 FR-2. 소스 표: security-sources.md §1.

| 종류 | 소스 | 과거 · 미래 |
|---|---|---|
| 금통위 통화정책방향 결정 | 한국은행 「통화정책방향 결정회의」 연도별 페이지 | 연도 선택(2021~ · 다음 해는 공표 뒤) |
| 소비자물가동향 | 국가데이터처 보도계획(올해 전체 · 날짜 + 시각) · 물가 보도자료 게시판(과거 게시일) | 둘 다 |
| 수출입동향 · 동시만기 | 규칙 계산(`domain/events`) | — |

페이지 구조가 바뀌어 0건이면 SourceError — 조용히 비우지 않는다(FR-9). 게시판 게시일은 **수정일로 바뀐 행이 있다**
(2026-01 분이 2026-03-06 — 실제 보도는 02-03). 보도계획에 없는 해의 행은
"기준월 다음 달 10일 안 · 12월분은 그달 25일 뒤"
검사를 통과한 것만 쓰고, 버린 행 수를 돌려준다.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

import httpx

from salt_forecast.domain.events import ScheduledEvent, scheduled
from salt_forecast.ingest.http import Pacer, SourceError, fetch_text

BOK_URL = "https://www.bok.or.kr/portal/singl/crncyPolicyDrcMtg/listYear.do"
MODS_PLAN_URL = "https://mods.go.kr/newsPln.es"
MODS_BOARD_URL = "https://mods.go.kr/board.es"
# 서비스 이름만 — 개인 정보를 싣지 않는다
USER_AGENT = "SALT-forecast/0.1"
FIRST_YEAR = 2021
# 물가 게시판 — 쪽마다 10건(소비자 · 생산자 등 섞임). 2021-01 분까지 9쪽이면 닿는다(2026-11 실측 8쪽)
BOARD_PAGES = 10

_HEADERS = {"User-Agent": USER_AGENT, "Accept": "text/html"}


def parse_bok_year(html: str) -> tuple[int | None, list[date]]:
    """선택된 연도와 회의일. 행 머리 "01월 15일(목)". 연도 선택 상자가 없으면(구조 변경) 연도 None."""
    sel = re.search(r'<option value="(\d{4})"\s+selected', html)
    if sel is None:
        return None, []
    year = int(sel.group(1))
    days = [
        date(year, int(m), int(d))
        for m, d in re.findall(r'<th scope="row">\s*(\d{2})월\s*(\d{2})일\(.\)\s*</th>', html)
    ]
    return year, sorted(set(days))


def bok_events(client: httpx.Client, pacer: Pacer, through_year: int) -> list[ScheduledEvent]:
    out: list[ScheduledEvent] = []
    for year in range(FIRST_YEAR, through_year + 1):
        html = fetch_text(
            client,
            BOK_URL,
            pacer,
            params={"mtgSe": "A", "menuNo": "200755", "pYear": str(year)},
            headers=_HEADERS,
            label=f"bok {year}",
        )
        got, days = parse_bok_year(html)
        if got != year:
            raise SourceError(f"bok {year} 연도 선택 없음 — 페이지 구조가 바뀌었을 수 있다", retryable=False)
        # 다음 해 일정은 공표 전이면 비어 있다 — 올해까지 비면 구조 변경
        if not days and year < through_year:
            raise SourceError(f"bok {year} 회의 0건 — 페이지 구조가 바뀌었을 수 있다", retryable=False)
        ref = f"{BOK_URL}?mtgSe=A&menuNo=200755&pYear={year}"
        out += [scheduled("kr_bok_rate", d, "bok", ref) for d in days]
    if not out:
        raise SourceError("bok 회의 0건", retryable=False)
    return out


_CPI_TITLE = r"(\d{4})년 (\d{1,2})월 (?:및 연간 )?소비자물가동향"


@dataclass(frozen=True, slots=True)
class CpiRelease:
    year: int
    month: int
    day: date


def parse_mods_plan(html: str) -> list[CpiRelease]:
    """보도계획 전체(올해). 행 = 보도일자 "11.03.( 화 )" · 보도시간 · 보도자료명. 연도는 제목 "2026년 전체 보도계획"."""
    head = re.search(r"<h3>\s*(\d{4})년", html)
    if head is None:
        return []
    plan_year = int(head.group(1))
    out: list[CpiRelease] = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S):
        cells = [
            re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", c)).strip()
            for c in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
        ]
        if len(cells) < 3:
            continue
        when = re.fullmatch(r"(\d{2})\.(\d{2})\.\(\s*.\s*\)", cells[0])
        title = re.fullmatch(_CPI_TITLE, cells[2])
        if when is None or title is None:
            continue
        out.append(
            CpiRelease(
                int(title.group(1)), int(title.group(2)), date(plan_year, int(when.group(1)), int(when.group(2)))
            )
        )
    return out


def parse_mods_board(html: str) -> list[CpiRelease]:
    """물가 보도자료 게시판 한 쪽 — 제목 뒤 첫 "게시일" 값."""
    text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))
    return [
        CpiRelease(int(y), int(m), date.fromisoformat(d))
        for y, m, d in re.findall(_CPI_TITLE + r"\s*게시일\s*(\d{4}-\d{2}-\d{2})", text)
    ]


def plausible(r: CpiRelease) -> bool:
    """기준월 다음 달 1~10일, 12월분은 그달 25일 이후도 — 2020~2026 보도 81건이 전부 이 안이다(수정일 1건만 밖)."""
    ny, nm = (r.year + 1, 1) if r.month == 12 else (r.year, r.month + 1)
    if (r.day.year, r.day.month) == (ny, nm):
        return r.day.day <= 10
    return r.month == 12 and (r.day.year, r.day.month) == (r.year, 12) and r.day.day >= 25


def merge_cpi(plan: list[CpiRelease], board: list[CpiRelease]) -> tuple[list[CpiRelease], int]:
    """기준월마다 하나 — 보도계획이 이긴다(원문 일정), 게시판은 검사를 통과한 것만. (결과, 버린 게시판 행 수)."""
    by_month: dict[tuple[int, int], CpiRelease] = {}
    rejected = 0
    for r in board:
        if not plausible(r):
            rejected += 1
            continue
        by_month.setdefault((r.year, r.month), r)
    for r in plan:
        by_month[(r.year, r.month)] = r
    return sorted(by_month.values(), key=lambda r: r.day), rejected


def cpi_events(client: httpx.Client, pacer: Pacer) -> tuple[list[ScheduledEvent], int]:
    plan_html = fetch_text(
        client,
        MODS_PLAN_URL,
        pacer,
        params={"mid": "a10305000000"},
        form={"oa_mm": "ALL", "mid": "a10305000000", "act": "list"},
        headers=_HEADERS,
        label="mods 보도계획",
    )
    plan = parse_mods_plan(plan_html)
    if not plan:
        raise SourceError("mods 보도계획 소비자물가 0건 — 페이지 구조가 바뀌었을 수 있다", retryable=False)
    board: list[CpiRelease] = []
    for page in range(1, BOARD_PAGES + 1):
        html = fetch_text(
            client,
            MODS_BOARD_URL,
            pacer,
            params={"mid": "a10301040100", "bid": "213", "nPage": str(page)},
            headers=_HEADERS,
            label=f"mods 게시판 {page}",
        )
        rows = parse_mods_board(html)
        board += rows
        if rows and min(r.year for r in rows) < FIRST_YEAR:
            break
    if not board:
        raise SourceError("mods 게시판 소비자물가 0건 — 페이지 구조가 바뀌었을 수 있다", retryable=False)
    merged, rejected = merge_cpi(plan, board)
    ref = f"{MODS_PLAN_URL}?mid=a10305000000"
    return [
        scheduled("kr_cpi", r.day, "mods", f"{ref} {r.year}-{r.month:02d}") for r in merged if r.year >= FIRST_YEAR
    ], rejected

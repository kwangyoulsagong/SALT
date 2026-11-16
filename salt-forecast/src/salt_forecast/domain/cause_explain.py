"""원인 설명 채점 — 사전등록 `cause-explain@1`(FC-REQ-022 FR-15 · F017 v4 순서 5c).

순수 계산, I/O 없음. 등록 문구(`preregistration/2026-11-16-cause-explain.toml`)를 코드로 옮긴 것 — 바꾸면 새 키.

한 행 = (시장, 종목, 거래일)의 그날 마지막 원인 스냅샷 + 닫힌 라벨 하나(h).
- K = top_kind (top_strength = likely 일 때만), 아니면 'not_likely'
- S = 국내 split.sector 부호(없거나 0 이면 split.market 부호) · 코인 split.market 부호, 없으면 'none'
- p_K · p_S = (과거 오름 + a · p_all) / (과거 수 + a)
  — '과거' = 같은 시장 · h 에서 라벨 available_at ≤ 이 행 captured_at
- 과거 같은 K 또는 S 가 30 미만이면 cold(채점 안 함)
- d = (p_S − y)² − (p_K − y)², 날짜 평균 → Newey–West(시차 h) 단측 t, d > 0

## 시점 규칙

과거 표본은 **이 행을 찍은 시각에 이미 닫힌 라벨만** — 같은 날 · 같은 시각의 다른 종목 결과를 쓰지 않는다
(누수 테스트가 본다).
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, date, datetime

import numpy as np

from salt_forecast.domain.base_rate import holm
from salt_forecast.domain.vol_range import newey_west_se

KEY = "cause-explain@1"
HORIZONS = (1, 5)
MARKETS = ("kr", "crypto")
SHRINK_A = 20.0
MIN_PAST = 30
MIN_ROWS = 300
MIN_DAYS = 30
NOT_LIKELY = "not_likely"
LOOKS = (date(2027, 1, 15), date(2027, 2, 14), date(2027, 3, 16))
ALPHA_PER_LOOK = 0.0166667
# 등록 커밋(898eec54) 날 — 이 뒤 찍은 스냅샷만 표본(전진만, 과거 원인은 재생 불가)
REGISTERED_AT = datetime(2026, 11, 16, 0, 0, tzinfo=UTC)


def kind_of(top_kind: str, top_strength: str) -> str:
    return top_kind if top_strength == "likely" else NOT_LIKELY


def _sign(x: object) -> str | None:
    if not isinstance(x, int | float) or not math.isfinite(float(x)) or float(x) == 0:
        return None
    return "pos" if float(x) > 0 else "neg"


def base_of(market: str, split: Mapping[str, object] | None) -> str:
    if not split:
        return "none"
    if market == "kr":
        return _sign(split.get("sector")) or _sign(split.get("market")) or "none"
    return _sign(split.get("market")) or "none"


@dataclass(frozen=True, slots=True)
class Row:
    """채점 재료 한 줄 — 원인(찍은 시각) + 결과(닫힌 시각)."""

    symbol: str
    trade_date: date
    captured_at: int
    label_at: int
    kind: str
    base: str
    excess: float


@dataclass(slots=True)
class Cell:
    market: str
    horizon: int
    rows_scored: int = 0
    rows_cold: int = 0
    rows_zero: int = 0
    days: int = 0
    brier_kind: float = float("nan")
    brier_base: float = float("nan")
    skill: float = float("nan")
    t: float = float("nan")
    p: float = float("nan")
    p_holm: float = float("nan")
    status: str = "forward"
    reason: str | None = None
    kinds: dict[str, dict[str, float]] = field(default_factory=dict[str, dict[str, float]])

    @property
    def below_min(self) -> bool:
        return self.rows_scored < MIN_ROWS or self.days < MIN_DAYS


def _phi(z: float) -> float:
    return 0.5 * math.erfc(-z / math.sqrt(2))


def _rate(up: float, n: float, prior: float) -> float:
    return (up + SHRINK_A * prior) / (n + SHRINK_A)


def forecasts(rows: Sequence[Row]) -> list[tuple[float, float] | None]:
    """행마다 (p_K, p_S) — 그 행을 찍은 시각에 이미 닫힌 라벨만으로(시점 규칙). cold 면 None. 입력 순서 그대로.

    라벨 0 행도 받는다(호출자가 거른다) — 과거 표본에서 0 은 '안 오름'으로 센다."""
    if not rows:
        return []
    lab = np.array([r.label_at for r in rows], dtype=np.int64)
    order = np.argsort(lab, kind="stable")
    lab_sorted = lab[order]
    idx: list[int] = [int(i) for i in order]
    y_sorted = np.array([1.0 if rows[i].excess > 0 else 0.0 for i in idx])
    cum_up = np.concatenate([[0.0], np.cumsum(y_sorted)])
    by_kind: dict[str, list[int]] = {}
    by_base: dict[str, list[int]] = {}
    for pos, i in enumerate(idx):
        by_kind.setdefault(rows[i].kind, []).append(pos)
        by_base.setdefault(rows[i].base, []).append(pos)
    kind_pos = {k: np.array(v, dtype=np.int64) for k, v in by_kind.items()}
    base_pos = {k: np.array(v, dtype=np.int64) for k, v in by_base.items()}

    def past(group: np.ndarray, n_closed: int) -> tuple[float, float]:
        m = int(np.searchsorted(group, n_closed, side="left"))  # 라벨 순 위치가 n_closed 미만 = 닫힌 것
        return float(y_sorted[group[:m]].sum()), float(m)

    out: list[tuple[float, float] | None] = []
    for r in rows:
        n_closed = int(np.searchsorted(lab_sorted, r.captured_at, side="right"))  # label_at ≤ captured_at
        if n_closed == 0:
            out.append(None)
            continue
        p_all = float(cum_up[n_closed]) / n_closed
        uk, nk = past(kind_pos[r.kind], n_closed)
        ub, nb = past(base_pos[r.base], n_closed)
        out.append(None if nk < MIN_PAST or nb < MIN_PAST else (_rate(uk, nk, p_all), _rate(ub, nb, p_all)))
    return out


def score_cell(market: str, h: int, rows: Sequence[Row]) -> Cell:
    """한 칸 — 행마다 그때까지 닫힌 과거로 p_K · p_S 를 내고 Brier 차이를 날짜 수준에서 검정."""
    cell = Cell(market, h)
    rs = [r for r in rows if r.excess != 0.0]
    cell.rows_zero = len(rows) - len(rs)
    if not rs:
        return cell
    days: list[int] = []
    ds: list[float] = []
    bk: list[float] = []
    bb: list[float] = []
    for r, f in zip(rs, forecasts(rs), strict=True):
        if f is None:
            cell.rows_cold += 1
            continue
        pk, pb = f
        y = 1.0 if r.excess > 0 else 0.0
        bk.append((pk - y) ** 2)
        bb.append((pb - y) ** 2)
        ds.append(bb[-1] - bk[-1])
        days.append(r.trade_date.toordinal())
    cell.rows_scored = len(ds)

    # 서술 — 종류별 표본 · 오른 비율(판정 아님)
    for k in sorted({r.kind for r in rs}):
        ys = [1.0 if r.excess > 0 else 0.0 for r in rs if r.kind == k]
        cell.kinds[k] = {"n": float(len(ys)), "up": float(np.mean(ys))}
    if not ds:
        return cell
    d_arr = np.array(ds)
    day_arr = np.array(days, dtype=np.int64)
    u, inv = np.unique(day_arr, return_inverse=True)
    m = np.bincount(inv, weights=d_arr) / np.bincount(inv)
    cell.days = int(u.size)
    cell.brier_kind = float(np.mean(bk))
    cell.brier_base = float(np.mean(bb))
    cell.skill = 1.0 - cell.brier_kind / cell.brier_base if cell.brier_base > 0 else float("nan")
    se = newey_west_se(m, h)
    if math.isfinite(se) and se > 0:
        cell.t = float(m.mean()) / se
        cell.p = 1.0 - _phi(cell.t)
    return cell


def judge(cells: Sequence[Cell], alpha: float, last_look: bool) -> None:
    """칸 넷 Holm(α). 사유 순서 below_min > no_effect. 마지막 판정 날짜 전이면 fail 대신 forward(사유는 남긴다)."""
    ps = [c.p if math.isfinite(c.p) else 1.0 for c in cells]
    for c, p in zip(cells, holm(ps), strict=True):
        c.p_holm = p
        reason = "below_min" if c.below_min else ("no_effect" if p > alpha else None)
        if reason is None:
            c.status, c.reason = "pass", None
        else:
            c.status, c.reason = ("fail" if last_look else "forward"), reason


def look_due(today: date, done: int) -> int | None:
    for i, d in enumerate(LOOKS):
        if i >= done and today >= d:
            return i
    return None


def look_cutoff(look: int) -> int:
    """판정 표본 끝 — 판정 날짜 00:00 KST 전에 닫힌 라벨만(늦게 돌아도 같은 표본)."""
    d = LOOKS[look]
    return int(datetime(d.year, d.month, d.day, tzinfo=UTC).timestamp()) - 9 * 3600

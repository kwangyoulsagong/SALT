"""meta-model@1 리포트 — 판정표가 먼저, 부차는 뒤. 선별 없이 전부 싣는다(FC-REQ-011)."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from salt_forecast.domain.meta_features import FEATURES
from salt_forecast.scoring.meta_model import AUC_FLOOR, MAX_ECE, FdrRow, RunOutput
from salt_forecast.scoring.meta_model_v2 import SYMBOL_FEATURES as SYMBOL_FEATURES_V2
from salt_forecast.scoring.meta_model_v2 import RunOutput as V2Output


def _f(x: float, d: int = 3, sign: bool = False) -> str:
    if x != x:
        return "—"
    return f"{x:+.{d}f}" if sign else f"{x:.{d}f}"


def _pct(x: float, d: int = 1) -> str:
    return "—" if x != x else f"{x * 100:.{d}f}%"


def _ok(b: bool) -> str:
    return "통과" if b else "**못 넘음**"


def render_report(key: str, sha: str, as_of: datetime, out: RunOutput, fdr: Sequence[FdrRow]) -> str:
    c = out.calib
    up, zero, dn = out.barrier_ratio
    sel = out.cpcv[out.selected]
    lines = [
        f"# 메타 모델 · 보정 — {key} ({as_of.date().isoformat()})",
        "",
        f"- 사전등록: `salt-forecast/preregistration/2026-09-29-meta-model.toml` · 실행 커밋 `{sha}`",
        f"- 행: 주 격자 {out.n_dates}주 × 종목 {out.n_symbols} = **{out.n_rows:,}행**"
        f" · 창 {out.window[0]} ~ {out.window[1]}",
        f"- 라벨: 삼중 장벽 20일(+2σ / −1σ) 상단 먼저 = 1. **양성 비율 {_pct(out.base_rate)}**"
        f" (+1 {_pct(up, 0)} / 0 {_pct(zero, 0)} / −1 {_pct(dn, 0)})",
        "- 표본 선택: 지금 업비트 원화 마켓 종목만(상장폐지 없음 — **생존 편향**)",
        "",
        "## 판정",
        "",
        "| 조건 | 기준 | 값 | 결과 |",
        "|---|---|---|---|",
        f"| CPCV AUC 하한 (선택 `{out.selected}`) | > {AUC_FLOOR} |"
        f" {_f(sel.auc)} [{_f(sel.auc_lo)}, {_f(sel.auc_hi)}] |"
        f" {_ok(sel.auc_lo > AUC_FLOOR)} |",
    ]
    if out.rule_diff is not None:
        r = out.rule_diff
        lines.append(
            f"| 로그손실 차 (선택 − 규칙만) | CI 상한 < 0 |"
            f" {_f(r.mean, 4, True)} [{_f(r.lo, 4, True)}, {_f(r.hi, 4, True)}] |"
            f" {_ok(r.hi < 0)} |"
        )
    if out.shuffle is not None:
        s = out.shuffle
        lines.append(
            f"| 셔플 점검 (날짜 안 라벨 섞기) | CI 가 0.5 포함 | {_f(s.auc)} [{_f(s.auc_lo)}, {_f(s.auc_hi)}] |"
            f" {_ok(out.shuffle_ok)} |"
        )
    if c is not None:
        lines += [
            f"| walk-forward ECE | ≤ {MAX_ECE} | {_f(c.ece, 4)} | {_ok(out.ece_ok)} |",
            f"| walk-forward BSS (기준 = 학습 창 양성 비율) | CI 하한 > 0 | {_f(c.bss, 4, True)}"
            f" [{_f(c.bss_lo, 4, True)}, {_f(c.bss_hi, 4, True)}] | {_ok(out.bss_ok)} |",
        ]
    verdict = (
        "**채택** — 확률을 원장에 발행한다(표시는 라이브 게이트 뒤)"
        if out.adopted
        else ("**채택 안 함** — 확률을 만들지 않는다. 규칙 점수 · 채점 성적만")
    )
    lines += ["", f"결론: {verdict}", ""]
    if out.global_shuffle is not None:
        g = out.global_shuffle
        lines += [
            "### 진단 — 셔플 점검 (판정 무관)",
            "",
            f"- 날짜 안 셔플 라벨의 **종목 간** AUC {_f(out.shuffle_cs_auc)} — 누수가 없으면 0.5",
            f"- 날짜까지 섞은 라벨의 풀링 AUC {_f(g.auc)} [{_f(g.auc_lo)}, {_f(g.auc_hi)}] — 누수가 없으면 0.5 포함",
            f"- 날짜별 실제 양성 비율 자체의 AUC {_f(out.oracle_date_auc)} — 풀링 AUC 중 시점(시장 전체) 몫의 상한."
            " 날짜 안 셔플은 이 몫을 남기므로 풀링 AUC 로 재면 누수가 없어도 0.5 가 안 나온다",
            "",
        ]

    lines += [
        "## CPCV — 학습기 넷 (6군 · 2시험 · 15분할 · 경로 5 · 퍼지 20일 · 엠바고 7일)",
        "",
        "| 학습기 | AUC | 95% CI | 로그손실 | 분할 AUC 최소 ~ 최대 |",
        "|---|---|---|---|---|",
    ]
    for name, r in out.cpcv.items():
        sa = [a for a in r.split_auc if a == a]
        rng = f"{min(sa):.3f} ~ {max(sa):.3f}" if sa else "—"
        lines.append(f"| {name} | {_f(r.auc)} | [{_f(r.auc_lo)}, {_f(r.auc_hi)}] | {_f(r.log_loss, 4)} | {rng} |")
    if out.select_diff is not None:
        d = out.select_diff
        lines += [
            "",
            f"- 선택: 로그손실 차(lgbm − logistic) {_f(d.mean, 4, True)} [{_f(d.lo, 4, True)}, {_f(d.hi, 4, True)}]"
            f" → **{out.selected}** (CI 상한 < 0 일 때만 lgbm)",
        ]
    cs, n_cs = out.cross_section_auc
    lines += [f"- 날짜별 종목 간 AUC 평균(부차): {_f(cs)} ({n_cs}주) — 풀링 AUC 에서 시점(시장 전체) 몫을 뺀 것", ""]

    if c is not None and out.walk is not None:
        p = c.parts
        lines += [
            "## walk-forward 보정 (4주 재학습 · 4년 창 · 직전 52주 OOS Beta 보정)",
            "",
            f"- 재학습 {out.walk.retrains}회 · 보정기 {len(out.walk.calibrators)}개 · 평가 {c.n:,}행 · {c.n_dates}주"
            f" · 시작 {c.first}",
            f"- Brier {_f(p.brier, 4)} = REL {_f(p.reliability, 5)} − RES {_f(p.resolution, 5)}"
            f" + UNC {_f(p.uncertainty, 4)}"
            f" (+ 구간 안 {_f(p.within_bin, 5, True)})",
            f"- BSS 참고(전 기간 양성 비율 기준 — 그때는 몰랐던 값): {_f(c.bss_full_rate, 4, True)}",
            f"- 보정 확률 AUC {_f(c.auc)}",
        ]
        if out.walk.calibrators:
            last_at, last = out.walk.calibrators[-1]
            lines.append(
                f"- 마지막 보정기({datetime.fromtimestamp(last_at, tz=UTC).date()}):"
                f" a {_f(last.a)} · b {_f(last.b)} · c {_f(last.c)}"
                f" · 풀 {last.n}행"
            )
        lines += ["", "| 구간 | 행 | 평균 확률 | 실제 비율 |", "|---|---|---|---|"]
        for i, (n, pk, yk) in enumerate(c.reliability, 1):
            lines.append(f"| {i} | {n:,} | {_pct(pk)} | {_pct(yk)} |")
        lines.append("")

    lines += ["## 피처 결측 비율", "", "| 피처 | 값 있음 |", "|---|---|"]
    lines += [f"| {f} | {_pct(out.feature_coverage.get(f, float('nan')), 0)} |" for f in FEATURES]
    lines += ["", f"## 중요도 — `{out.selected}` 전 기간 적합(부차)", "", "| 피처 | 값 |", "|---|---|"]
    lines += [f"| {k} | {_f(v, 3, True)} |" for k, v in sorted(out.importance.items(), key=lambda kv: -abs(kv[1]))]

    lines += [
        "",
        "## 부차 — 전략 참고 · DSR (화면에 가지 않는다)",
        "",
        "주마다 walk-forward p 상위 20% − 전체 동일가중 7일 로그수익 − 왕복 0.1%. 시도 N = 4,"
        " 시도 샤프 분산은 순위가 있는 셋(climatology 는 상수 확률이라 순위 없음 — 사전등록과 다른 점)."
        f" 무작위 최대 샤프 기대 SR0 = {_f(out.sr0, 3)}/주",
        "",
        "| 학습기 | 주 | 샤프/주 | 연환산(×√52) | DSR |",
        "|---|---|---|---|---|",
    ]
    for s in out.strategies:
        ann = s.sharpe_weekly * 52**0.5 if s.sharpe_weekly == s.sharpe_weekly else float("nan")
        lines.append(f"| {s.name} | {s.weeks} | {_f(s.sharpe_weekly, 3, True)} | {_f(ann, 2, True)} | {_f(s.dsr, 3)} |")

    passed, tested = out.fdr_symbols
    lines += [
        "",
        "## 부차 — BY-FDR (q = 0.05)",
        "",
        f"- 종목별 BSS > 0: 검정 {tested} · **통과 {passed}**"
        " — 종목별 '잘 맞음' 배지는 통과 종목에만 만들 수 있다(이 슬라이스는 안 만든다)",
    ]
    if fdr:
        surv = [r for r in fdr if r.survives]
        lines += [
            f"- rule-ic@1 탐색표(국면 all): 검정 {sum(1 for r in fdr if r.p == r.p)} · **살아남음 {len(surv)}**"
            " (p 는 CI 정규 근사). 1차 판정은 바꾸지 않는다",
            "",
            "| 항목 | 모드 | 지평 | 라벨 | IC | p | BY |",
            "|---|---|---|---|---|---|---|",
        ]
        for r in fdr:
            x = r.row
            lines.append(
                f"| {x.item} | {x.mode} | {x.horizon_days} | {x.label_kind} | {_f(x.ic_mean, 3, True)} |"
                f" {r.p:.2g} | {'살아남음' if r.survives else '—'} |"
            )
    else:
        lines.append("- rule-ic@1 탐색표: DB 에 백테스트 행이 없다")
    return "\n".join(lines) + "\n"


def render_report_v2(key: str, sha: str, as_of: datetime, out: V2Output) -> str:
    """meta-model@2 — 판정표 먼저, 탐색은 뒤."""
    m, r, d = out.main, out.rule, out.diff
    lines = [
        f"# 메타 모델 v2 · 기저율 + 종목 간 순위 — {key} ({as_of.date().isoformat()})",
        "",
        f"- 사전등록: `salt-forecast/preregistration/2026-09-29-meta-model-2.toml` · 실행 커밋 `{sha}`",
        f"- 행: 주 격자 {out.n_dates}주 × 종목 {out.n_symbols} = **{out.n_rows:,}행** · 양성 {_pct(out.base_rate)}"
        " (라벨 · 창 · 유니버스 = meta-model@1)",
        "- **표본 재사용**: meta-model@1 이 같은 표본을 봤다 — 채택은 원장 발행 허가일 뿐,"
        " 표시는 라이브 게이트(새 표본) 뒤",
        "",
        "## 판정",
        "",
        "| 조건 | 기준 | 값 | 결과 |",
        "|---|---|---|---|",
    ]
    if m is not None and r is not None and d is not None:
        lines += [
            f"| CPCV 종목 간 AUC 하한 | > 0.52 | {_f(m.auc)} [{_f(m.lo)}, {_f(m.hi)}] ({m.n_dates}주) |"
            f" {_ok(m.lo > 0.52)} |",
            f"| 종목 간 AUC 차 (모델 − 규칙만 {_f(r.auc)}) | CI 하한 > 0 |"
            f" {_f(d.mean, 4, True)} [{_f(d.lo, 4, True)}, {_f(d.hi, 4, True)}] | {_ok(d.lo > 0)} |",
        ]
    for label, s in (("날짜 안 셔플", out.shuffle_within), ("전체 셔플", out.shuffle_global)):
        if s is not None:
            lines.append(
                f"| {label} 종목 간 AUC | CI 가 0.5 포함 | {_f(s.auc)} [{_f(s.lo)}, {_f(s.hi)}] |"
                f" {_ok(s.lo <= 0.5 <= s.hi)} |"
            )
    c = out.calib
    if c is not None:
        lines += [
            f"| walk-forward ECE | ≤ {MAX_ECE} | {_f(c.ece, 4)} | {_ok(out.ece_ok)} |",
            f"| walk-forward BSS (기준 = 학습 창 양성 비율) | CI 하한 > 0 | {_f(c.bss, 4, True)}"
            f" [{_f(c.bss_lo, 4, True)}, {_f(c.bss_hi, 4, True)}] | {_ok(out.bss_ok)} |",
        ]
    verdict = (
        "**채택** — 확률을 원장에 발행한다(표시는 라이브 게이트 뒤)"
        if out.adopted
        else "**채택 안 함** — 확률을 만들지 않는다. 슬라이스 5 는 확률 없이"
    )
    lines += ["", f"결론: {verdict}", ""]
    if c is not None and out.walk is not None:
        p = c.parts
        lines += [
            "## walk-forward 보정",
            "",
            f"- 재학습 {out.walk.retrains}회 · 보정기 {len(out.walk.calibrators)}개 · 평가 {c.n:,}행"
            f" · {c.n_dates}주 · 시작 {c.first}",
            f"- Brier {_f(p.brier, 4)} = REL {_f(p.reliability, 5)} − RES {_f(p.resolution, 5)}"
            f" + UNC {_f(p.uncertainty, 4)} (+ 구간 안 {_f(p.within_bin, 5, True)}) · AUC {_f(c.auc)}",
            "",
            "| 구간 | 행 | 평균 확률 | 실제 비율 |",
            "|---|---|---|---|",
        ]
        lines += [f"| {i} | {n:,} | {_pct(pk)} | {_pct(yk)} |" for i, (n, pk, yk) in enumerate(c.reliability, 1)]
        lines.append("")
    if m is not None:
        names = [*SYMBOL_FEATURES_V2, "funding_7d_missing"]
        lines += ["## 순위 가중치 — 전 기간 적합(부차)", "", "| 피처(순위) | 가중치 |", "|---|---|"]
        pairs = sorted(zip(names, m.weights, strict=True), key=lambda kv: -abs(kv[1]))
        lines += [f"| {k} | {_f(v, 3, True)} |" for k, v in pairs]
        lines.append("")
    lines += ["## 탐색 (판정 무관)", "", "| 변형 | ECE | BSS | 95% CI |", "|---|---|---|---|"]
    for name, e in out.explore.items():
        lines.append(
            f"| {name} | {_f(e.ece, 4)} | {_f(e.bss, 4, True)} | [{_f(e.bss_lo, 4, True)}, {_f(e.bss_hi, 4, True)}] |"
        )
    sr, n = out.sharpe
    ann = sr * 52**0.5 if sr == sr else float("nan")
    lines += [
        "",
        f"- 순위 상위 20% − 전체 7일 로그수익(왕복 0.1%): 샤프 {_f(sr, 3, True)}/주 · 연 {_f(ann, 2, True)} · {n}주",
    ]
    return "\n".join(lines) + "\n"

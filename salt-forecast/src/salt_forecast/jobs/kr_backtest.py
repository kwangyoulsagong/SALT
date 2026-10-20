"""국내 주식 워크포워드 백테스트 → prediction · score (kind=backtest) + 게이트 + 리포트(FC-REQ-009 · FC-REQ-020).

코인 `backtest` 와 같은 엔진 · 같은 채점 — 다른 것은 달력(주 첫 거래일 · 5거래일)과 모델 버전 이름, 보정 · 채점 풀에
국내 주식만 들어간다는 것(FEATURE-011 FR-82), 그리고 **게이트**: 실력은 기간마다 풀링 검정 한 번, 종목은 거부권만
(FC-REQ-020 FR-1 · FR-2). 리포트에 풀링 표 · 상시 플라시보(FR-5) · 꼬리별 커버리지(FR-4)를 싣는다.

척도 도전자(사전등록 `kr-scale@1`, FR-11 ~ FR-15)도 여기서만 돈다 — 판정 대상 하나 + 절제 셋. 매일 작업 · 게이트에는
챔피언이 바뀌기 전까지 없다. `kr-scale@2` 는 형태 없는 범위 HAR 를 선택 보정 α · 이전 창까지 재고, 절제 둘
(ACI · 분산비)을 처음 잰다.
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from salt_forecast.domain.kr_universe import KEY as UNIVERSE_KEY
from salt_forecast.domain.kr_universe import eligible_at
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs._data import load_kr, load_kr_bars
from salt_forecast.models.engine import HORIZONS, POOL_WEEKS, WalkForward
from salt_forecast.models.kr_scale import (
    ACI_GAMMA,
    KEY_2,
    KR_CHALLENGER,
    KR_CHALLENGER_2,
    KR_HAR_RANGE_ACI,
    KR_SCALE_2_ABLATIONS,
    KR_SCALE_MODELS,
    TRAIN_WEEKS,
    KrScalePanel,
    scale_aci,
    scale_providers,
)
from salt_forecast.models.kr_scale import KEY as SCALE_KEY
from salt_forecast.models.kr_stock import (
    KR_BASELINE,
    KR_ENSEMBLE,
    KR_ENSEMBLE_V1,
    KR_PRODUCTION,
    kr_model_params,
    kr_providers,
)
from salt_forecast.scoring.coverage import TailObs, render_coverage
from salt_forecast.scoring.evaluate import Paired, paired_scores, score_forecast
from salt_forecast.scoring.pooled_gate import (
    POOLED_WEEKS,
    kr_cards,
    per_symbol_cards,
    placebo,
    pooled_gate,
    pooled_gates,
    render_placebo,
    render_pooled,
    trim,
    window_dates,
)
from salt_forecast.scoring.report import render
from salt_forecast.scoring.scale_report import ScaleObs, render_qlike
from salt_forecast.store.db import engine
from salt_forecast.store.predictions import (
    PredictionRow,
    ScoreRow,
    register_model,
    scores_for,
    write_gates,
    write_predictions,
    write_scores,
)

JOB = "kr_backtest"
REPORTS = Path(__file__).resolve().parents[3] / "reports"
# 사전등록 `kr-scale@2` — 시도한 구성 4개(kr-scale@1)에서 골랐으니 α 를 4로 나눈다
SELECTION_CONFIGS = 4
SELECTED_ALPHA = 0.05 / SELECTION_CONFIGS


def _dt(t: int) -> datetime:
    return datetime.fromtimestamp(t, tz=UTC)


def main(argv: list[str] | None = None) -> int:
    args = base_parser("국내 주식 워크포워드 백테스트").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        now = parse_as_of(args.as_of)
        series, cal = load_kr(eng, now)
        if not series:
            log.warning("국내 주식 일봉 없음 — ingest_kr_stock 먼저", extra={"fields": {"job": JOB}})
            return 0
        bars = load_kr_bars(eng, now)
        universe_cache: dict[int, frozenset[str]] = {}

        def eligible(t: int) -> frozenset[str]:
            if t not in universe_cache:
                universe_cache[t] = eligible_at(bars, cal, t)
            return universe_cache[t]

        panel = KrScalePanel(bars, cal, eligible, HORIZONS)
        models = (KR_BASELINE, KR_ENSEMBLE, KR_ENSEMBLE_V1, *KR_SCALE_MODELS)
        providers = {**kr_providers(cal, with_retired=True), **scale_providers(panel)}
        wf = WalkForward(series, providers, schedule=cal, eligible=eligible, aci=scale_aci())
        as_ofs = wf.backtest_as_ofs()
        preds: list[PredictionRow] = []
        scores: list[ScoreRow] = []
        tails: dict[str, list[TailObs]] = {m: [] for m in models}
        scales: dict[str, list[ScaleObs]] = {m: [] for m in models}
        for t in as_ofs:
            for e in wf.emit(t, with_realized=True):
                assert e.realized is not None
                p = PredictionRow(
                    e.symbol,
                    e.horizon_weeks,
                    _dt(e.as_of),
                    e.model_version,
                    "backtest",
                    e.base_close,
                    e.forecast,
                    e.direction,
                )
                preds.append(p)
                lo, hi = e.forecast.interval(90)
                tails[e.model_version].append(TailObs(e.symbol, e.horizon_weeks, e.as_of, lo, hi, e.realized))
                scales[e.model_version].append(ScaleObs(e.symbol, e.horizon_weeks, e.as_of, e.scale, e.realized))
                scores.append(
                    score_forecast(
                        p.symbol,
                        p.horizon_weeks,
                        p.as_of,
                        p.model_version,
                        "backtest",
                        p.forecast,
                        p.direction,
                        e.realized,
                    )
                )
        first = _dt(as_ofs[0]).date() if as_ofs else None
        last = _dt(max(int(p.as_of.timestamp()) for p in preds)).date() if preds else None
        notes = [
            f"- 실행 {now.date()} · 격자 = 주 첫 거래일 09:00 KST(월요일 휴장이면 화요일) {len(as_ofs)}주"
            f"({first} ~ 라벨 끝난 마지막 {last}) · 보정 풀 {POOL_WEEKS}주 · 엠바고 = 라벨 끝(5h 거래일 뒤 16:00 KST)",
            "- 기간 h주 = **5h 거래일**. 기준 종가 = as_of 에 아는 마지막 거래일 종가(직전 거래일)",
            "- 표본은 **겹친다**(h>1 이면 이웃 as_of 의 라벨이 겹친다) — 유효 표본은 표의 수보다 작다",
            f"- 대상: 시점 고정 유니버스 `{UNIVERSE_KEY}` — as_of 마다 그때 알던 최근 20거래일 전부 거래 · 평균 "
            f"거래대금(종가 × 거래량) ≥ 10억 원 · 일봉 ≥ 250개. "
            f"후보 = 지금 상장된 보통주 {len(series)}종목(일봉 최대 5년). "
            f"격자당 대상 중앙값 {int(np.median([len(wf.eligible_at(t)) for t in as_ofs])) if as_ofs else 0}종목",
            "- **남은 생존 편향**: 후보가 지금 상장된 종목뿐(상장폐지 이력 없음 — FR-8 대기)",
            "- 보정 · 채점 풀은 국내 주식만(코인과 섞지 않음). LightGBM 없음(척도 회귀는 풀링 OLS)",
            f"- 척도 도전자 사전등록 `{SCALE_KEY}`(`preregistration/2026-10-12-kr-scale.toml`) — "
            f"실험 4개(판정 대상 `{KR_CHALLENGER}` 하나 + 절제 셋) · `{KEY_2}`"
            f"(`preregistration/2026-10-20-kr-scale-2.toml`) — 판정 `{KR_CHALLENGER_2}`"
            "(앞 등록의 절제 — 결과를 보고 골랐다) "
            f"+ 새 절제 둘. **누적 실험 6개**. "
            f"풀링 HAR 적합 = 라벨 끝난 최근 {TRAIN_WEEKS}주 × 그때 유니버스. "
            "시장 성분은 KOSPI 지수 대신 유니버스 동일가중(거래대금 ≥ 10억 · ±30% 안) — 보고서 권고 13 이탈",
            "- 도전자는 적합에 26주가 필요해 기준보다 늦게 시작한다 — 풀링 검정은 같은 (종목, as_of) 짝만 본다",
        ]
        universe = sorted({(s, h) for s in series for h in HORIZONS})
        old_pairs = trim(paired_scores(scores, KR_ENSEMBLE, KR_BASELINE, universe, cal.on_grid))
        v1_pairs = trim(paired_scores(scores, KR_ENSEMBLE_V1, KR_BASELINE, universe, cal.on_grid))
        _, verdicts = kr_cards(old_pairs, KR_ENSEMBLE, KR_BASELINE, HORIZONS)
        ch_pairs = trim(paired_scores(scores, KR_CHALLENGER, KR_BASELINE, universe, cal.on_grid))
        _, ch_verdicts = kr_cards(ch_pairs, KR_CHALLENGER, KR_BASELINE, HORIZONS)

        def count(p: Mapping[tuple[str, int], Paired]) -> int:
            return kr_cards(p, KR_ENSEMBLE, KR_BASELINE, HORIZONS)[0]

        def count_challenger(p: Mapping[tuple[str, int], Paired]) -> int:
            return kr_cards(p, KR_CHALLENGER, KR_BASELINE, HORIZONS)[0]

        def count_challenger_2(p: Mapping[tuple[str, int], Paired]) -> int:
            return kr_cards(p, KR_CHALLENGER_2, KR_BASELINE, HORIZONS, SELECTED_ALPHA)[0]

        full_pairs = {
            m: paired_scores(scores, m, KR_BASELINE, universe, cal.on_grid)
            for m in (KR_CHALLENGER_2, KR_CHALLENGER, *KR_SCALE_2_ABLATIONS)
        }
        recent2 = {m: pooled_gate(trim(p), HORIZONS, SELECTED_ALPHA) for m, p in full_pairs.items()}
        earlier2 = {m: pooled_gate(p, HORIZONS, SELECTED_ALPHA, skip=POOLED_WEEKS) for m, p in full_pairs.items()}

        def passed2(m: str) -> list[int]:
            return [h for h in HORIZONS if recent2[m][h].passed and earlier2[m][h].passed]

        ch2_placebo = placebo(trim(full_pairs[KR_CHALLENGER_2]), count_challenger_2)
        fd2 = ch2_placebo.false_discovery
        champ_set, ch2_set = set(passed2(KR_CHALLENGER)), set(passed2(KR_CHALLENGER_2))
        switch = ch2_set > {1, 2} and fd2 is not None and fd2 <= 0.20
        span = window_dates(full_pairs[KR_CHALLENGER_2], 1, POOLED_WEEKS)
        last_t = as_ofs[-1] if as_ofs else 0
        aci_lines = [
            f"| {h}주 | " + " · ".join(f"{a:.3f}" for a in wf.aci_alpha(last_t, h, KR_HAR_RANGE_ACI)) + " |"
            for h in HORIZONS
        ]
        scale2 = [
            f"## `{KEY_2}` 판정 — `{KR_CHALLENGER_2}`",
            "",
            f"사전등록 규칙: 기간 통과 = 최근 {POOLED_WEEKS}주 통과 **그리고** 이전 창 통과, 둘 다 α {SELECTED_ALPHA:g}"
            f"(0.05 ÷ 시도 구성 {SELECTION_CONFIGS}). 이전 창 = 최근 {POOLED_WEEKS}주 앞의 마지막 {POOLED_WEEKS}주"
            + (f"(1주 기준 {span[0].date()} ~ {span[1].date()})" if span else "")
            + f". 교체 = 통과 집합이 챔피언 `{KR_CHALLENGER}`의 지금 통과(1 · 2주)를 포함하고 더 많음 + 플라시보 ≤ 20%",
            "",
            "| 모델 | 최근 창 통과 | 이전 창 통과 | 둘 다 |",
            "|---|---|---|---|",
            *(
                f"| `{m}` | {', '.join(f'{h}주' for h in HORIZONS if recent2[m][h].passed) or '없음'} | "
                f"{', '.join(f'{h}주' for h in HORIZONS if earlier2[m][h].passed) or '없음'} | "
                f"**{', '.join(f'{h}주' for h in passed2(m)) or '없음'}** |"
                for m in full_pairs
            ),
            "",
            f"- 플라시보(`{KR_CHALLENGER_2}` · α {SELECTED_ALPHA:g} 최근 창 + 종목 거부권): 관측 {ch2_placebo.observed}"
            f" · 귀무 평균 {ch2_placebo.null_mean:.1f} · p {ch2_placebo.p_value:.3f}"
            f" · 거짓 발견 {'—' if fd2 is None else f'{fd2:.0%}'}",
            f"- 직전 챔피언 `{KR_CHALLENGER}` 이 같은 기준으로 통과한 기간: "
            f"{', '.join(f'{h}주' for h in sorted(champ_set)) or '없음'}",
            f"- **결정: {'교체' if switch else '유지'}** — 도전자 {sorted(ch2_set) or '없음'}"
            " · 챔피언 기준 집합 [1, 2]",
            "",
            *render_pooled(f"`{KR_CHALLENGER_2}` 최근 창", recent2[KR_CHALLENGER_2], SELECTED_ALPHA),
            *render_pooled(f"`{KR_CHALLENGER_2}` 이전 창", earlier2[KR_CHALLENGER_2], SELECTED_ALPHA),
            *render_pooled(f"`{KR_CHALLENGER}`(직전 챔피언) 이전 창", earlier2[KR_CHALLENGER], SELECTED_ALPHA),
            *(
                line
                for m in KR_SCALE_2_ABLATIONS
                for w, v in (("최근", recent2[m]), ("이전", earlier2[m]))
                for line in render_pooled(f"절제 — `{m}` {w} 창(판정 대상 아님)", v, SELECTED_ALPHA)
            ),
            f"## ACI 마지막 α — `{KR_HAR_RANGE_ACI}`(γ {ACI_GAMMA:g})",
            "",
            "구간 90 · 80 · 50% 순서. 명목 0.100 · 0.200 · 0.500. α 범위 [0.005, 0.5]"
            " — 50% 구간은 좁힐 수 없다(등록 그대로)",
            "",
            "| 기간 | α |",
            "|---|---|",
            *aci_lines,
            "",
        ]

        def count_old(p: Mapping[tuple[str, int], Paired]) -> int:
            return per_symbol_cards(p, KR_ENSEMBLE_V1, KR_BASELINE)

        ablations = [
            line
            for m in KR_SCALE_MODELS
            if m not in (KR_CHALLENGER, *KR_SCALE_2_ABLATIONS)
            for line in render_pooled(
                f"절제 — `{m}`(판정 대상 아님)",
                pooled_gate(trim(paired_scores(scores, m, KR_BASELINE, universe, cal.on_grid)), HORIZONS),
            )
        ]
        sections = [
            *scale2,
            *render_pooled(
                f"풀링 실력 검정 — `{KR_CHALLENGER}`(`{SCALE_KEY}` 판정 대상, 2026-10-20 은퇴)", ch_verdicts
            ),
            *render_placebo(
                f"상시 플라시보 — `{KR_CHALLENGER}` 풀링 게이트 + 종목 거부권", placebo(ch_pairs, count_challenger)
            ),
            *ablations,
            *render_qlike(
                "척도 QLIKE",
                {m: scales[m] for m in (KR_BASELINE, *KR_SCALE_MODELS)},
                KR_BASELINE,
                HORIZONS,
            ),
            *render_pooled(f"풀링 실력 검정 — `{KR_ENSEMBLE}`(은퇴 챔피언, 위치 0)", verdicts),
            *render_pooled(f"풀링 실력 검정 — `{KR_ENSEMBLE_V1}`(은퇴, 비교용)", pooled_gate(v1_pairs, HORIZONS)),
            *render_placebo(f"참고 플라시보 — `{KR_ENSEMBLE}` 풀링 게이트 + 종목 거부권", placebo(old_pairs, count)),
            *render_placebo(
                f"참고 플라시보 — `{KR_ENSEMBLE_V1}` 옛 종목별 게이트(FC-REQ-009)", placebo(v1_pairs, count_old), None
            ),
            *render_coverage("꼬리별 커버리지", tails, HORIZONS),
        ]
        report = render(
            scores,
            list(models),
            KR_BASELINE,
            f"국내 주식 워크포워드 백테스트 — 운영 {KR_PRODUCTION}",
            notes,
        ) + "\n".join(["", *sections])
        log.info("백테스트", extra={"fields": {"job": JOB, "predictions": len(preds), "as_ofs": len(as_ofs)}})
        if args.dry_run:
            print(report)
            return len(preds)
        for m in models:
            register_model(eng, m, m.split("@")[0], kr_model_params(m))
        n = write_predictions(eng, preds) + write_scores(eng, scores)
        REPORTS.mkdir(exist_ok=True)
        (REPORTS / f"kr-backtest-{now.date()}.md").write_text(report, encoding="utf-8")
        t_now = int(now.timestamp())
        stale = {s for s, c in series.items() if not cal.fresh(c, t_now, slack=1)}
        rows = pooled_gates(
            scores_for(eng, [KR_PRODUCTION, KR_BASELINE]),
            KR_PRODUCTION,
            KR_BASELINE,
            universe,
            stale,
            cal.on_grid,
            HORIZONS,
        )
        return n + write_gates(eng, rows)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())

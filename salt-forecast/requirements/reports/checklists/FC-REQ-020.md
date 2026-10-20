# FC-REQ-020 체크리스트 — 국내 주식 전망 정확도 (P0 · 2026-10-09 / P1 · P2 · 2026-10-12 / P3 · 2026-10-20)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `domain/pooled.py` · `scoring/pooled_gate.py` · `jobs/kr_backtest.py` · `jobs/kr_daily.py` | 4기간 Holm — 전부 미통과(p 0.11~0.36). 게이트 204행 renderable 0 |
| FR-2 | `domain/scoring.evaluate_gate(pooled_skill=…)` | 거부권 = 표본 · 신선도 · 보정 · 폭. `test_veto_only_ignores_symbol_iid_skill` |
| FR-3 | `domain/pooled.block_for` · `nonoverlap` | 블록 2~20주(PW). 4기간 모두 주 검정 · 비중첩 판정 일치 |
| FR-4 | `scoring/coverage.py` | 위 7~8% · 아래 1~4%(위치 0). σ̂ 3분위 표. **시총 버킷 미검증** — Python 에 시총 없음 |
| FR-5 | `scoring/pooled_gate.placebo` · `jobs/gate_audit.py` | 국내 새 게이트 관측 0 · 귀무 1.3. 옛 게이트 재현 73%. 코인 30% · p 0.080 |
| FR-6 | `domain/baselines.empirical_shape_zero` · `kr-ens-baseline@0.2.0` | 중앙값 0 · 상승 확률 0.5 테스트. 기준 대비 +0.01~0.46% |
| FR-7 (P1 · 2026-10-12) | `domain/kr_universe.py` · `models/engine.WalkForward(eligible=)` · `jobs/_data.load_kr_bars` · 사전등록 `preregistration/2026-10-09-kr-universe.toml` | 전 종목 5년 2,605종목 · 격자당 중앙값 973. 4기간 미통과 — d̄ −0.12~−0.56%(위치 0 이 기준보다 나쁨). 꼬리 위 5.4~5.7% · 아래 5.7~7.2%(P0 기울기 해소). 옛 게이트 거짓 발견 77% |
| FR-11 (P2) | `domain/har.py` · `models/kr_scale.py` · 사전등록 `preregistration/2026-10-12-kr-scale.toml` | 종가 HAR · + 범위 절제 4기간 모두 통과. QLIKE 종가 HAR 1주 −0.086(95% 음수) |
| FR-12 (P2) | `domain/har.fit_har` FHS · `kr-har-fhs@0.1.0` | 1 · 2주 통과 · 3 · 4주 미통과 — 위 꼬리 4% · 아래 6~8%(형태가 기울었다) |
| FR-13 (P2) | `models/engine.mondrian` · `RawForecast.bucket` | 코인 해시 불변(55,832행). FHS 대비 차이 ±0.1%p |
| FR-15 (P2) | `models/kr_stock.KR_PRODUCTION` · `jobs/kr_daily.py` | 판정 대상 1주 +2.00% · 2주 +1.34% 통과 · 플라시보 17%(p 0.085) → 챔피언 교체. 게이트 1주 662 · 2주 574 |
| FR-15 (P3) | 사전등록 `preregistration/2026-10-20-kr-scale-2.toml` · `jobs/kr_backtest.py` 판정 절 · `scoring/pooled_gate.pooled_gate(alpha, skip)` | `kr-har-range@0.1.0` α 0.0125 최근 · 이전 창 4기간 통과(이전 창 +1.22~+1.47%) · 플라시보 6%(p 0.025) → **챔피언 교체**. 직전 챔피언은 이전 창 0기간 |
| FR-13 (P3) | `domain/calibration.aci_step` · `miss_rates` · `models/engine.WalkForward(aci=)` | 절제 `kr-har-range-aci@0.1.0` — 최근 창 3 · 4주 미통과. 누수 테스트 `tests/leakage/test_aci_leakage.py`(as_of 뒤 봉 지워도 α · 전망 동일) |
| FR-11 (P3) | `domain/har.HarFit.vr` · `kr-har-range-vr@0.1.0` | 분산비로도 QLIKE +0.37(도전자 +0.36) — 스미어링 가설 기각 |
| 신선도 (P3) | `domain/calendar.presumed_weekdays` · `jobs/_data.load_kr` | 원천 멈춤(일봉 10-07 · 개장일 표 10-09) 뒤 평일 가정 → 국내 게이트 `stale_inputs` 7,473 · 켜짐 0(수정 전 2,658 켜짐) |

## 검증

- P3 `kr_backtest --dry-run --as-of 2026-06-30`: 격자 220주 · 예측 691만 · **139분 · 최고 4.9GB**(exit 0). 같은 결정 — `kr-har-range@0.1.0` 최근 · 이전 창 4기간 통과 · 플라시보 거짓 발견 4%(p 0.015) · 직전 챔피언 이전 창 0기간. 절제 ACI 는 이 시점엔 4기간 통과(10-20 시점은 3 · 4주 미통과 — 시점에 흔들림) · 분산비는 이전 창 2주 미통과. **DB 쓰기 없는 dry-run 도 139분 · sys 3,144초** → 병목은 DB 가 아니라 메모리(스왑 · 페이지 폴트)
- P3 dry-run `--as-of 2026-06-30` main 대비: 코인 `daily` 예측 1,856 동일(53 → 29초) · 코인 `backtest` 리포트 37줄 **완전 동일**(185 → 125초) · `kr_daily` 예측 8,016(챔피언이 달라 내용은 다름 · 채점 대기 9,686 → 15,618 은 은퇴 챔피언 live 채점 포함)
- P3: `ruff check` · `ruff format --check`(278) · `pyright` 0 · `lint-imports` 3 kept · `pytest` 290 통과 · 1 건너뜀 · `tests/leakage` 34 통과(새 2: ACI 미래 봉 · 다른 모델 불변) · 엔진 성능 수정 전후 출력 해시 동일(합성 코인 8,120 · 합성 국내 15,840 · 실데이터 60종목 138,212행) · 250종목 cProfile 500 → 188초 · `kr_backtest` **139분 · 최고 5.9GB**(예산 초과) · `kr_daily` 실제 64~72초 · 1.96GB

- `ruff check` · `ruff format --check`(259) · `pyright` 0 · `lint-imports` 3 kept · `pytest` 전체 통과(새 13개) · `tests/leakage` 28 통과
- P0: `kr_backtest` 49초(예산 5분) · `kr_daily --dry-run` 2.9초 · `gate_audit` 129초(감사 작업, 매일 아님)
- P2: `ruff format --check`(273) · `pyright` 0 · `lint-imports` 3 kept · `pytest` 280 통과 · `tests/leakage` 32 통과(새 4: 미래 봉 · 당일 봉 · 적합 엠바고 · 재현) · `tests/models/test_engine_since.py`(국내 · 코인 전체 격자와 동일) · 코인 기준 모델 출력 해시 main 과 동일 · `kr_backtest` 84분 · 4.3GB · `kr_daily --dry-run` 46초 · 1.78GB · 실제 62초
- P1: 서버 백필 3회(맥 잠자기로 1회차 중단 → `caffeinate`) · `ingest_kr_stock` 286만 행 81초 · `kr_backtest` **41분**(예산 5분 초과 — 2,366종목 × 234주, 예산 표는 ~300종목 기준) · `kr_daily --dry-run` **163초**(예산 1분 초과) · `pytest tests/domain/test_kr_universe.py` 통과

## 미충족 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 서버 수집 상시 가동 | `salt-server` 가 10-09 부터 꺼져 수집이 멈췄다(워커가 서버 프로세스 안 · 배포 없음). 2026-10-20 서버 유스케이스를 스크립트로 1회 불러 10-19 확정 봉까지 채움(2,594종목 · 18,119봉 · 1,126초, 실패 11) → `kr_daily` 예측 6,768 · 게이트 1주 776 · 2주 698 · 3주 613 · 4주 562 켜짐 | 배포 환경 확정 시 |
| 서버 개장일 관측(`probe`)이 휴장 10-09 를 개장으로 기록 | 그날 기록이 남아 국내 유니버스가 비었다(봉 없는 거래일) — 일봉 뒤 역산 재실행으로 바로잡음. 원인(휴장일에 일봉 조회가 봉을 돌려줬는지) 미확인 · `salt-server` 변경이라 이번 범위 밖 | `SRV-REQ-040` 다음 서버 작업 |
| 밖 표본 확인 | 판정 대상의 최근 창은 P2 에서 봤다 · 이전 창도 전체 평균 표는 봤다 | 라이브 26주 채점(2027-04 경) |
| 국내 카드 화면 | 서버 · BFF · FE 경로 없음(FEATURE-011 FR-83) | 화면 슬라이스(5d) |
| 범위 계열 QLIKE 가 기준보다 나쁨 | 분산비 절제로 척도 상수배 가설 기각(P3) — 원인 미상 | 다음 척도 등록(`kr-scale@3`) — 단면 이질성 · 범위 극단값 |
| FR-8 | 상장폐지 원천 · 이용 조건 미확인 — 지금 후보는 현재 상장 종목뿐(남은 생존 편향) | `SRV-REQ-040` FR-41 원천 확인 뒤 |
| FR-9 · FR-10 · FR-14 | 상태별 억제 · 수정주가 재작성 · 국면 표 | 다음 슬라이스 |
| NexCP 보정 | ACI 가 3 · 4주를 깎아 우선순위 낮음 | 필요 시 새 등록 |
| `kr_backtest` 성능 예산(139분 · 5.9GB) | 엔진은 2.7배 빨라졌지만 모델 9개 · 판정 절 · 플라시보 · 스왑으로 전체는 늘었다. 프로파일이 뒷단(짝 점수 · 플라시보 · 점수 쓰기)을 안 봤다 | 다음 슬라이스 착수 전 — dry-run 도 139분 · sys 절반이라 메모리(예측 691만 객체)가 병목. 은퇴 · 절제 모델을 기본에서 빼기 · 점수를 배열로 · 단계별 진행 로그 |
| `kr_daily` 실제 64~72초(예산 1분) | DB 쓰기 포함 | 같이 |
| 5종목 일봉 누락 | KIS 초당 한도(EGW00201) — 3회차에도 실패 | 밤 정기 백필(`kr-full-daily-candles`)이 재시도 |
| 커버리지 시총 버킷 · 국면 표(FR-14) | 시총 입력이 Python 에 없음. 표본이 2022-04~ 로 늘어 공매도 금지 구간이 들어왔다 | FR-14 |
| 코인 게이트 풀링화 | 사용자 결정 | 이 리포트 뒤 |

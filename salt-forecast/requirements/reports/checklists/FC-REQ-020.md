# FC-REQ-020 체크리스트 — 국내 주식 전망 정확도 (P0 · 2026-10-09 / P1 · P2 · 2026-10-12 / P3 · P4 · 2026-10-20)

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
| 신선도 (P3) | `domain/calendar.presumed_weekdays` · `jobs/_data.load_kr` | 원천 멈춤(일봉 10-07 · 개장일 표 10-09) 뒤 평일 가정 → 국내 게이트 `stale_inputs` 7,473 · 켜짐 0(수정 전 2,658 켜짐). 같은 날 빠진 일봉(10-19 까지)을 채운 뒤 `stale_inputs` 10(못 받은 종목) · 켜짐 1주 776 · 2주 698 · 3주 613 · 4주 562 · `tests/domain/test_krx_calendar.py` 원천 멈춤 테스트 2 |
| 성능 (P4) | `store/prices._read_grouped` · `scoring/pooled_gate.kr_placebo` · `domain/scoring` 하한 캐시 · 지연 · `models/engine._GridEntry` · `scoring/frame.py` · `scoring/report.py` · `jobs/_common.stage_logger` | `kr_backtest --dry-run --as-of 2026-06-30` 전체 2,605종목 **139분 · 4.9GB → 14.9분 · 2,041MB**, 리포트 P3 와 **바이트 동일**. 300종목 표본 589 → 160초 · 1.54 → 0.74GB(바이트 동일) |

## 검증

- P4: `ruff check` · `ruff format --check`(280) · `pyright` 0 · `lint-imports` 3 kept · `pytest` 296 통과 · 1 건너뜀(새 6: 플라시보 배열판 · 하한 지연 · 열 점수 · 렌더 동치) · `tests/leakage` 34 통과 · 엔진 출력 해시 동일(합성 코인 8,120 · 합성 국내 15,840 · 실데이터 60종목 176,870행) · 일봉 읽기 kis · upbit · binance 배열 main 과 동일 · 코인 `backtest --dry-run` 리포트 main 과 바이트 동일 · `daily` · `kr_daily --dry-run` main 대비 행 수 동일(1,856 · 8,016, 채점 대기 15,618) · `kr_daily` 55초 · 1,433MB(main 1,756MB)
- P4 공용 코드(일봉 읽기 · 게이트 판정)를 쓰는 다른 작업 16개 `--dry-run --as-of 2026-06-30` main 과 나란히: 전부 exit 0 · stdout 동일 · 로그 동일(리포트 경로만 다름) · dry-run 이 쓰는 리포트 9개(meta_model 1 · 2 · onchain_regime · regime_gate · dvol_sigma · rule_ic · search_interest · target_weight 1 · 2)는 실행 커밋 줄만 다르고 동일 — 대조로 생긴 파일은 지웠다. 대상: meta_model · meta_model_v2 · market_regime · target_weight_live · signals · regate · onchain_regime · events · regime_gate · dvol_sigma · rule_ic · search_interest · gate_audit · target_weight · target_weight_v2 · volatility
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
| ~~국내 카드 화면~~ | 닫힘 2026-10-23 — 슬라이스 5d(`FE-REQ-041` FR-23, 고정 응답 확인). 실데이터 렌더는 서버 재기동 뒤 | 닫힘 |
| 범위 계열 QLIKE 가 기준보다 나쁨 | 분산비 절제로 척도 상수배 가설 기각(P3) — 원인 미상 | 다음 척도 등록(`kr-scale@3`) — 단면 이질성 · 범위 극단값 |
| FR-8 | 상장폐지 원천 · 이용 조건 미확인 — 지금 후보는 현재 상장 종목뿐(남은 생존 편향) | `SRV-REQ-040` FR-41 원천 확인 뒤 |
| FR-9 · FR-10 · FR-14 | 상태별 억제 · 수정주가 재작성 · 국면 표 | 다음 슬라이스 |
| NexCP 보정 · ACI 채택 | ACI 가 시점에 흔들림(06-30 4기간 통과 · 10-20 3 · 4주 미통과) — 고정 CQR 이 안정 | 필요 시 새 등록 |
| `kr_backtest` 성능 예산(5분 · 2GB) | P4 로 14.9분 · 2,041MB(dry-run). 예산표는 ~300종목 × 모델 2 기준 — 일의 양이 약 47배. 남은 시간은 엔진 raw 격자(약 5분) · 은퇴 v1 옛 종목별 게이트 플라시보(약 5분) | 은퇴 · 절제 모델을 리포트에서 빼는 결정 시(리포트가 바뀌어 이번 범위 밖) · 실제 실행(DB 쓰기 포함) 측정은 다음 챔피언 등록 때 |
| `kr_backtest` 실제 실행(쓰기 포함) 시간 · 메모리 | 이번엔 dry-run 만 쟀다 — 결과가 바뀌지 않는 성능 작업이라 691만 행 재기록이 필요 없었다 | 다음 백테스트 실제 실행 때 |
| `kr_daily` 실제 64~72초(예산 1분) | dry-run 은 55초 · 1,433MB 로 줄었지만 실제(쓰기 포함)는 다시 재지 않았다 | 다음 매일 실행 기록(`job_run`) |
| 11종목 일봉 누락(10-20 이어받기 실패 · 게이트 `stale_inputs` 10) | KIS 초당 한도(EGW00201) — 재시도 3회 뒤 실패 | 밤 정기 백필(`kr-full-daily-candles`)이 재시도 |
| 커버리지 시총 버킷 · 국면 표(FR-14) | 시총 입력이 Python 에 없음. 표본이 2022-04~ 로 늘어 공매도 금지 구간이 들어왔다 | FR-14 |
| 코인 게이트 풀링화 | 사용자 결정 | 이 리포트 뒤 |

## 2026-10-23 — FR-1 · FR-2 범위 카드 적용(F011 5d 에서 발견)

| 항목 | 결과 |
|---|---|
| 발견 | 5d 화면 연결 뒤 실 DB: 국내 1주 범위 카드 48 중 32 가 `blocked_reason = not_sharper_than_baseline`(거부권)인데 `range_renderable = true` — 범위 게이트가 보정만 봤다 |
| 수정 | `domain/scoring.evaluate_gate` 풀링 경로 — 거부권 · 풀링 패배를 `range_reason` 에도. `RangeBlockedReason` 두 값 추가 |
| 실데이터 | `kr_daily`(as_of 10-23, 1분 21초) 재실행 → 국내 범위 카드 1주 48 → 16 · 2주 46 → 14 · 3주 42 → 10 · 4주 39 → 10(= 전체 게이트 통과 수), 거부권 32 · 32 · 32 · 29 꺼짐. 코인 201 · 191 · 176 · 168 그대로 |
| 화면 | 실서버 · BFF 경유 — 삼성전자 4기간 꺼짐("단순 예측보다 범위가 좁지 않아 꺼 둠" ×2 · 보정 ×2) · 003670 4기간 렌더(폭 단순 대비 1~4% 좁음) · BTC 그대로 |
| 테스트 | `test_pooled_veto_turns_off_range_card_too`(거부권 · 풀링 패배 · 통과 · 코인 경로) · ruff · pyright 0 · lint-imports 3/3 · pytest 전체 · leakage |
| 소비 작업 | `evaluate_gate` 소비 7개 — 코인 4개(`backtest` · `daily` · `regate` · `regime_gate`)는 `pooled_skill=None` 이라 바뀐 분기 밖. 범위 필드를 읽는 곳은 `store` 쓰기뿐. `kr_backtest` 리포트 대조는 아래 |
| 리포트 대조 | `kr_backtest --dry-run --as-of 2026-06-30` 이 브랜치 vs main 워크트리 — **바이트 동일**(37,900 B · 예측 691만 · 11분 38초 vs 11분 59초). 리포트는 전체 게이트(`renderable`) 수를 세고 범위 열을 쓰지 않는다 |

## 2026-10-23 — FR-9 상태별 억제(슬라이스 5e)

| 항목 | 결과 |
|---|---|
| 판정 | `domain/kr_status.status_reason` — 정리매매 > 거래정지 > 관리종목 > 경고 · 위험(02 · 03). 투자주의 01 통과 · 정상 통과(`tests/domain/test_kr_status.py` 3) |
| 게이트 | `scoring/pooled_gate.with_status` — 두 열 모두 상태 사유 · 지표(커버리지 · 폭 · 빗나간 수) 유지 · 상태 없는 종목 행 동일(`test_status_turns_off_both_columns_keeps_metrics`) |
| 실데이터 | 마스터 1회 동기화(정리매매 3) 뒤 `kr_daily`(as_of 10-23, 1분 13초): 상태 종목 216 · 1주 행 정지 113 · 관리 81 · 경고/위험 8 · 정리매매 1(4기간 같음 203) · **켜진 범위 카드 16 · 14 · 10 · 10 그대로** · 오늘 예측이 있는 상태 종목 0(거래대금 유니버스가 이미 거른다) |
| 화면 경로 | 브랜치 서버(워커 없이 4100) → BFF 4101 → 000650 4기간 `investment_warning` · 003670 렌더 그대로 → web 3100 카드에 "투자경고 · 위험 종목이라 꺼 둠" ×4(`FE-REQ-041` 체크리스트) |
| 검증 | ruff · format · pyright 0 · lint-imports 3/3 · pytest 전체 · leakage |
| 재현(수정) | 첫 판은 과거 `--as-of` 에도 오늘 상태를 걸었다 — 마스터 `synced_at` 을 `available_at` 으로: `status_known_at`(동기화 뒤 · 3일 안). 테스트 `test_status_known_only_after_sync_and_while_fresh` · 재실행 `applied: true`(synced 10-23 11:40 KST) 같은 수 |
| 백테스트 대조 | `kr_backtest --dry-run --as-of 2026-06-30` 이 브랜치 vs main 워크트리 — 리포트 **바이트 동일**(37,900 B · 462줄 · 11분 5초 · 3.0GB vs 11분 20초 · 2.8GB). `kr_daily` 같은 조건 dry-run 도 같은 출력 |
| 두 열 | 방향(`renderable`) · 범위(`range_renderable`) 켜진 수 같이 — 1주 16/16 · 2주 14/14 · 3주 10/10 · 4주 10/10(전과 같다) |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 상태가 장중에 바뀐 종목 | 마스터는 하루 1회(07:30, 전날 기준) — 최대 하루 늦다 | 서버가 실시간 상태(`kr_stock_quotes.status_code`)를 판정에 줄 때(필요하면) |
| 폐지 최종 수익률 채점 | 폐지 종목 원천이 없다 | FR-8 |
| 지금 상태로 백테스트 억제 | 상태 이력이 없다 — 지금 상태를 과거에 쓰면 미래 정보 | 상태 이력 원천이 생길 때 |

## 2026-10-23 — FR-10 수정주가 재작성 · 원천 끊김(슬라이스 5f)

| 항목 | 결과 |
|---|---|
| 실측(전) | `price_history` 국내 일봉 ±30% 넘는 일간 점프 41건 · 34종목. KIS 지금 값과 대조 — 093240 · 017650 · 032080 저장 옛 기준 / KIS 새 기준(재작성), 011000 · 145210 · 101140 KIS 자체가 점프(원천 미수정) |
| 서버 복구 | 44종목(의심 34 + 시총 상위 대조군 10) 브랜치 동기화 1회(토요일 회차 모양): 재작성 10 · 실패 0 · 252호출 · 4분 13초 → 점프 41 → 31건. 남은 31 = 원천 미수정 상승(1.31 배 초과 21건 중 남은 것) + 정리매매 하락 |
| 옮기기 | `ingest_kr_stock` 2분 · 최고 RSS 2.9GB · 앞쪽 정리 0행(교체 이력 길이 그대로) |
| 끊김 | `domain/kr_breaks.up_limit_breaks`(직전 봉 대비 > 1.31 — 처음 1.30 이었다가 정정, 아래 · 하락 제외) · `CloseSeries.as_of` 가 그 시점까지의 마지막 끊김부터 · `KrxSessions.realized` · 패널 `forward_log_return` 걸친 라벨 None · `build_panel` 끊김 날 r · 범위 분산 결측 |
| 테스트 | `tests/domain/test_kr_breaks.py` 5 · `tests/ingest/test_krx_daily.py` 2 · 누수 `test_future_source_break_does_not_change_earlier_forecasts`. **변이 확인**: as_of 가 지금 아는 마지막 끊김으로 자르게 바꾸면 누수 테스트 · 도메인 테스트 둘 다 실패 |
| 검증 | ruff · format · pyright 0 · lint-imports 3/3 · pytest 310 passed 1 skipped · leakage 35 |
| 백테스트 — **최종(1.31)** | 같은 복구 데이터에서 끊김 전 → 후: **06-30** 판정 그대로 · skill 1주 +1.98% 그대로 · 4주 +1.46 → +1.45% · 표본 1주 195,756 → 195,754 · 플라시보 관측 2997 → 3144 · 귀무 132.1 → 133.1 · 거짓 발견 4% 그대로(p 0.015). **10-23** 판정 그대로 · skill 1주 +1.79% 그대로 · 4주 +1.29 → +1.28% · 표본 209,416 → 209,414 · 플라시보 관측 2682 → 2746 · 귀무 110.8 → 130.0 · 거짓 발견 4 → 5%(p 0.015 → 0.020). 깨어 있던 실행 721s · 3.5GB(10-23) |
| 백테스트(as_of 10-23, 1.30 판 — 대체됨) | 복구 + 끊김 전/후 dry-run — 판정 그대로(`kr-har-range@0.1.0` 최근 · 이전 창 4기간 통과), d̄ 1주 +1.85 → +1.84% · 4주 +1.15 → +1.13%, 표본 1주 210,367 → 208,771(−0.8%), 플라시보 관측 2682 → 2703 · 귀무 110.8 → 140.7 · 거짓 발견 4 → 5%(p 0.015 → 0.025). 16분 51초 → 13분 29초 · 2.7 → 2.6GB |
| 백테스트(as_of 06-30, 1.30 판 — 대체됨) | 복구만: 판정 그대로 · 소수 셋째 자리 12줄 차이 · 플라시보 같음(4%). 복구 + 끊김(코드만의 효과 — 같은 복구 데이터에서 끊김 전/후): 판정 그대로(4기간 최근 · 이전 창 통과), skill 1주 +1.98 → +1.95% · 4주 +1.46 → +1.41%, 표본 1주 195,756 → 194,241(−0.8%), 플라시보 관측 2997 → 3088 · 귀무 132.1 → 131.9 · 거짓 발견 4% 그대로(p 0.015). 11분 40초 · 3.0GB |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 기업 행사 이벤트 플래그(배당락 · 증자 · 감자, 공시 T → T+1) | 일정 원천이 없다 — DART 는 사용자가 안 쓰기로(2026-10-08), KIS 예탁원 정보 TR 은 허용 목록 밖 · 모의 지원 미확인 | 원천 결정 시 |
| 현금배당 미조정 | KIS 수정주가가 현금배당을 조정하는지 1차 출처 미확인(보고서 §데이터 정의 — 약) — 배당락 −2% 내외는 끊김 규칙에 안 걸린다 | 이벤트 플래그와 함께 |
| 하락 쪽 미수정 분할 | 지금 데이터에 없다(하락 점프는 전부 정리매매). 생기면 정리매매와 구별할 근거(정지 · 상태 이력)가 필요 | 상태 이력 원천 또는 실제 사례 발생 시 |
| 전 종목 재작성 복구 | 44종목만 돌렸다 — 나머지는 상시 서버가 이 코드로 토요일 회차를 돌 때 | 머지 · launchd 재시작 뒤 첫 토요일 08:00 |
| 복구 전 기록된 라이브 채점 | 의심 34종목의 국내 라이브 채점은 모델당 1행 · \|실현\| > 0.6 없음 — 다시 채점하지 않는다(채점 행은 영구 근거) | 없음(기록만) |

### 공용 코드 대조 · 끊김 기준 정정(2026-10-24)

- 공용 코드(`CloseSeries.breaks` · `KrxSessions.realized` · 패널) 소비 작업 dry-run main 대조(`--as-of 2026-10-22`, main = `git worktree` + `PYTHONPATH`): **코인 · 공용 20개 같다** — `backtest`(리포트 본문 같음, 진행 로그 `eta_s` 만 다름) · `daily` · `regate` · `regime_gate` · `volatility` · `signals` · `market_regime` · `meta_model` · `meta_model_v2` · `rule_ic` · `target_weight` · `target_weight_v2` · `target_weight_live` · `dvol_sigma` · `events` · `onchain_regime` · `search_interest` · `gate_audit` · `ops_monitor` · `due`(둘 다 인자 오류 exit 2). dry-run 이 쓴 리포트 9개는 "실행 커밋" 한 줄만 다르다 — 대조 뒤 지웠다(`rule-ic-…-2026-10-22.md` 는 세션 전부터 있던 미추적 파일인데 같은 이름으로 덮였다 — 내용은 커밋 줄만 다름). **국내 3개는 의도대로 다르다** — `kr_daily` · `kr_volatility` · `kr_backtest`(아래)
- 1.31 로 다시: `kr_daily` main 과 **같다**(예측 408) · `kr_volatility` 렌더 57 그대로, 이력 부족 91 → 103 · 기준 대비 실력 없음 24 → 13 · 가격 멈춤 2433 → 2432(끊김 뒤 짧아진 종목이 "이력 부족"으로) · pytest · leakage 통과
- **끊김 기준 정정 1.30 → 1.31**(`d3aec26`): 대조 중 `kr_volatility` "이력 부족"이 91 → 121 로 늘어 직접 셌다 — 1.30 초과 상승 150건 중 129건이 1.3000~1.3008, 수정주가 반올림으로 찍힌 **진짜 상한가**였다(실제 +30% 를 채점에서 빼 위 꼬리가 좋아 보일 뻔). 다음 값 1.3424 까지 비어 있어 1.31 로. 끊김 21건 · 실측 상한가 두 건 · 가장 작은 끊김 테스트. 위 백테스트 표의 끊김 수치는 1.30 판 — 1.31 재측정은 아래
- 맥 잠자기로 대조의 `kr_backtest` 벽시계(main 3.5h · 브랜치 17h)는 측정이 아니다. 깨어 있던 06-30 같은 조건: 끊김 전 코드 701s · 후 700s

## 2026-10-26 — FR-14 국면별 커버리지(슬라이스 5g)

| 항목 | 결과 |
|---|---|
| 코드 | `domain/kr_regime`(날짜 라벨 — 경계는 결과 전 고정) · `scoring/coverage.render_regime_coverage`(전체 표와 같은 비중첩 주를 국면으로 가름) · `kr_backtest` 리포트 절 하나(기준 · 챔피언). 피처 · 게이트 · DB 쓰기 무변경 |
| 테스트 | `tests/domain/test_kr_regime.py` 7(경계 앞뒤 · 재개일 · 2026) · `test_regime_coverage_splits_the_same_nonoverlapping_weeks`(같은 주 · 빈 국면 행) |
| 검증 | ruff · format · pyright 0 · lint-imports 3/3 · pytest 318 passed 1 skipped · leakage 35 passed |
| main 대조 | `kr_backtest --dry-run --as-of 2026-10-26` 브랜치 vs main(`git worktree` + `PYTHONPATH`, 모듈 경로 확인): 새 절 앞 462줄 **바이트 동일**(`cmp`). 공용 함수 변경 없음(`coverage.py` 는 함수 추가만, 소비처 `kr_backtest` · `scoring/frame`(타입만)) |
| 시간 · 메모리 | 브랜치 722s · 최고 2,967MB / main 789s · 2,310MB. 차이는 새 절 전 단계(raw 격자 · 판정)에서 이미 생김 — 새 절 단계에서 최고점 그대로(2,967 → 2,967) |
| 리포트 | `reports/kr-backtest-2026-10-26.md` = 위 dry-run 출력(실제 실행과 같은 문자열 — 리포트는 쓰기 전에 만든다). DB 예측 · 점수 · 게이트는 안 썼다 |
| 결과 | REQ §"FR-14 국면별 커버리지" 표 — 챔피언 2026 폭 평시의 약 1.5배 · 2026 아래 꼬리 1주 6.1 ± 3.6% · 4주 10.4 ± 8.1%(10주) · 평시 위 6.2~6.6% 아래 3.2~3.9% · 공매도 금지 가장 명목. 모델 · 게이트 무변경 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 2026 아래 꼬리 초과가 실제인가 | 국면 안 주 10~42 · 급락이 몇 주에 몰려 날짜 클러스터 ± 가 명목을 덮는다 | 라이브 26주(국내 라이브 채점이 2026 하반기를 덮을 때) |
| 국면 조건부 보정 | 근거 없음 — 하려면 도전자 사전등록(FR-15) | 라이브에서 아래 꼬리 초과가 확인되면 |
| 상 · 하한 마감일 검열 | FR-12 와 같이 안 함(권고 16 후반) | 형태 모델 재도전 시 |
| 시총 버킷 | FR-4 그대로 미검증 — 원천에 시점 시총 없음 | 시점 고정 시총 원천 시 |
| 백테스트 메모리 예산 | main 도 2.3GB(P4 06-30 기준 2.04GB) — 주 · 데이터가 늘어서. 이 슬라이스와 무관 | 다음 성능 작업 |
| 실제 실행(DB 쓰기) | 리포트 전용 변경이라 dry-run 만 — 같은 코드의 쓰기 경로는 무변경 | 다음 정기 `kr_backtest` 실행 |

## F011 슬라이스 6 — 국내 지수 · 투자자 순매수 (2026-10-26, 파일만 걸침)

| 항목 | 결과 |
|---|---|
| 예측 코드 | 변경 없음 — 투자자 표를 읽는 작업 0(`grep -r kr_stock_investor_flows salt-forecast/src` 0건) |
| 판정 | 무변경 |

미검증: 없음

## 2026-10-29 REQ 전수 조사

- 문서 정정: 코인 게이트 수치 P0 실측(p 0.080 · 30%). 근거는 코드(`ops/daily.sh` · `domain/ops_health.py` · `models/kr_stock.py`) · 같은 문서 결과 절 · 교차 REQ. 코드 무변경

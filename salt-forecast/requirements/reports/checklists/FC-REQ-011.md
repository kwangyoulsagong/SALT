# FC-REQ-011 체크리스트 — 메타 모델 · 보정 (F010 슬라이스 4)

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 사전등록 | `preregistration/2026-09-29-meta-model.toml`(커밋 `8846a4f`, 결과 전) · `jobs/meta_model` · `store/rule_ic.register` 재사용 | DB `forecast.preregistration` `meta-model@1` 1행(첫 실행 `new: true`, 재실행 `new: false` — 같은 해시). 등록 뒤 파일 무변경 |
| FR-2 피처 | `domain/meta_features.py` | 누수 테스트: 뒤 70행을 붙여도 앞 450행 피처 11개 전부 동일. 실데이터 결측: 펀딩 56% · HMM 91% · σ 분위 93% · 나머지 99~100% |
| FR-3 로지스틱 | `domain/logistic.py` | 테스트: 2만 행 계수 복원(±0.06) · 표준화는 학습 창 값만 · 결측 표시 열 |
| FR-4 확률 채점 | `domain/prob_calibration.py` | 테스트: AUC = 쌍 전수 계산(동점 포함, 성질 테스트 40개) · 가중 AUC = 행 복제 · Beta 보정이 과신 확률 ECE 를 < 0.01 로 · 무관한 확률에서도 단조 · Brier 분해 항등식 · 부트스트랩 재현 · CI 가 점 추정 포함 |
| FR-5 CPCV · FDR · DSR | `domain/cpcv.py` | 테스트: 15분할 · 행마다 5번 시험 · 학습 행 라벨 창과 시험 행 겹침 0 · BY 가 BH 보다 엄격(8개 중 1) · NaN 제외 · CI → p · DSR 단조 |
| FR-6 학습기 | `models/meta.py` | pyright strict · LightGBM 결정적(`deterministic` · 스레드 1). 재실행 판정 로그 동일 |
| FR-7 실행 | `scoring/meta_model.py` | 누수 테스트: walk-forward 재학습마다 학습 행 라벨 끝 ≤ 재학습 시점 · 보정 행은 원 예측이 있는 행만. 셔플 진단 3종 |
| FR-8 리포트 | `reports/meta-model-meta-model-1-2026-09-29.md` | 판정 5행 · CPCV 4행 · 신뢰도 10구간 · 피처 11 · 중요도 12 · 전략 3 · FDR 94행. 70초 · 최대 메모리 538MB |
| FR-9 발행 | — | **채택 안 됨 → 만들지 않음** |
| FR-10 `meta-model@2` | `preregistration/2026-09-29-meta-model-2.toml`(`4163e18`, 결과 전) · `domain/cross_section.py` · `domain/logistic`(offset) · `scoring/meta_model_v2.py` · `jobs/meta_model_v2` | 테스트: 날짜 안 순위(동점 · 결측 · 다른 날 무관) · 다른 날 값을 바꿔도 순위 동일 · offset 로지스틱 기울기 복원 · 시점 몫과 순위 신호 분리 · 점수 0 이면 기저율 그대로. 실행 34초 · 667MB. 리포트 `reports/meta-model-meta-model-2-2026-09-29.md` |

## 판정 (as_of 2026-09-29, 실행 코드 `9dc41bd`)

**채택 안 함.** 신호 게이트 통과(AUC 0.652 [0.613, 0.691] · 규칙만보다 로그손실 −0.012 [−0.023, −0.001]) · ECE 0.034 통과 ·
BSS −0.005 [−0.025, +0.019] **못 넘음** · 셔플 점검 0.609 **못 넘음**(진단 — 누수 아님: 종목 간 0.491 · 전체 셔플 0.495 [0.488, 0.503]).
전체 표는 `FC-REQ-011` 결과 절 · 리포트.

`meta-model@2`(실행 코드 `d6963d2`): **채택 안 함.** 종목 간 AUC 0.599 [0.577, 0.623] · 규칙만 대비 +0.109 [+0.081, +0.136] · 셔플 두 점검 통과(0.509 · 0.498) · ECE 0.040 통과 · BSS −0.018 [−0.042, +0.007] **못 넘음**.

## 검증

| 명령 | 결과 |
|---|---|
| `uv run ruff check .` · `ruff format --check .` | 통과 · 152 파일 |
| `uv run pyright` | 0 errors |
| `uv run lint-imports` | 3 kept(층 · domain I/O 금지 · 같은 층 독립 — scoring 이 models 를 import 하지 않는다) |
| `uv run pytest -q` | 135 passed · 1 skipped(스키마 계약 — env 없음) |
| 스키마 계약(`FORECAST_DATABASE_URL` 지정, 실 DB) | 1 passed — 이 슬라이스 DDL 변경 없음 |
| `uv run pytest tests/leakage -q` | 17 passed(+2) |
| `jobs.meta_model --dry-run --no-report --as-of 2026-06-30` | 52초 · 판정 같음(채택 안 함, ECE 0.028 · BSS CI [−0.025, +0.022]) |
| `jobs.meta_model --as-of 2026-09-29` | 70초 · 최대 메모리 538MB — 성능 예산(워크포워드 < 5분 · < 2GB) 안 |
| `jobs.meta_model_v2 --dry-run --no-report --as-of 2026-06-30` | 37초 · 판정 같음(채택 안 함, BSS CI [−0.044, +0.007]) |
| `jobs.meta_model_v2 --as-of 2026-09-29` | 34초 · 667MB |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 매일 확률 발행 · 원장 · 서버 표시 게이트 | 두 등록 모두 채택 안 됨 | 새 표본 등록 채택 시 |
| `meta-model@3` | 같은 표본 세 번째 사용은 증거가 아니다 | 라이브 원장 새 표본 뒤(2026-11-23~) |
| 라이브 표본 성적 | 원장 발행 2026-09-28~ | 2026-11-23 |
| 생존 편향 | 상장폐지 원천 없음 | 리서치 §10 슬라이스 7 |

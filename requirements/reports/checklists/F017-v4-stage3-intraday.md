# 체크리스트 — F017 v4 순서 3a 장중 기저율 5분봉 (2026-11-16)

슬라이스 `requirements/specs/in-progress/F017-v4-stage3-intraday-slice.md` · 브랜치 `feat/f017-v4-s3-intraday-base-rate`

## 검증 — 돌린 것

- [x] 사전등록을 결과 전에 커밋 — `@2` `f6e92a03`(실행 전 철회) · `@3` `1c234984`. DB 등록은 `@3` 첫 통계 실행 때(`new: true`)
- [x] 예측: `ruff check` · `ruff format --check` · `pyright`(0) · `lint-imports`(3 kept) · `pytest -q` 전체 통과 · `pytest tests/leakage` 통과 · 스키마 계약(`FORECAST_DATABASE_URL` 로 store 6 통과)
- [x] 예측 새 시험 9 — 국내 격자(장중 칸만 · 09:05 ~ 15:30) · 라벨 장 마감 끊김 · K7 칸 · VI 칸(봉 시작 ≤ 발동 < 끝, 그날 첫 발동만) · 거시 칸(+1시간) · 같은 시각 평균(오늘 제외 · 창 모자라면 없음) · 크기 묶음 · **구간 경계 이중 계산 0** · **미래 봉을 더해도 과거 조건 그대로(누수)**
- [x] 결함 하나 그 자리에서: 소형 묶음 자르기 `ceil(n × (1 − 2/3))` 가 부동소수로 한 칸 밀림(30종목 → 소형 19) — 정수 계산으로. **`@1` 일봉 코드(`scoring/base_rate.size_groups`)에 같은 식이 남아 있다** — 아래 미검증
- [x] 서버: `npm run build` · `lint` · `npm test` 1,601 통과 · `test:layer-check` · 새 시험 둘(장중 문턱 성립 → 1h `now` · 15분 묵음 → 평소 / 장중 통계 없음 → `longer` 1d) · 분봉 백필 시험 1년 창 · 회차 상한 · VI 400일 정리
- [x] 마이그레이션 둘 로컬 적용(추가만) — `horizon_unit` 열 + 뷰 끝 열 · `public.v_kr_vi_export`
- [x] 실데이터: 국내 통계 실행(14행 · 전부 `below_min` — 13거래일) · 5분 실행 launchd 등록(300초) 로그 정상 · 코인 문턱 함수(백필 끝난 7종목) — 30분 문턱 = 기준 × 1.03 · 0.97
- [x] 실 HTTP(임시 사용자 — 초대 코드 → 가입 → 확인 뒤 계정 삭제 0건): `GET /api/coach/scenario` BTC · 005930 — 1h · 4h `longer`(fallbackFrom 1d) · 1d · 5d `usual` — 회귀 0
- [x] 서버 재시작 · `/health` 200 — 밤 22:00 `kr-minute-backfill` 등록

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 코인 1h · 4h 실숫자 · 실화면 | 업비트 5분봉 2년 백필 진행 중(13:18 시작 · 약 10시간) | 11-17 아침 첫 `daily.sh` 통계 실행 뒤 — 패널 1h · 4h `now`/`usual` · 리포트 `reports/base-rate-base-rate-3-*.md` 커밋 |
| 국내 1h · 4h 실숫자 | KIS 일별분봉 1년 백필(밤 22:00 · 2만 호출)이 2~3밤 | 11-19 전후 — 국내 행 `ok` · 서로 다른 날 ≥ 60 |
| K5(VI) 숫자 | KIS 가 지난 VI 를 주지 않아 오늘부터 쌓임 | 2027-02 전후(서로 다른 날 60) |
| 통계 실행 시간 · 메모리(코인 전 구간) | 백필 전이라 전 구간을 못 돌렸다 | 첫 통계 실행 — `job_run` duration · 단계 RSS(예산 < 5분 · < 2GB) |
| `@1` 소형 묶음 한 칸 밀림 | 등록된 실행의 코드라 고치면 `@1` 결과가 바뀐다 — 사용자와 정할 일 | 사용자 결정(고치고 재실행 · 리포트에 정정) |
| Swagger YAML 경고(`krStock.routes.ts` 401 중복) | 이번 변경 전부터(재시작마다 12회) | 별도 정리 |
| C5 · 코인 유의 조건 | 정의 · 이력 없음 | `base-rate@4` |

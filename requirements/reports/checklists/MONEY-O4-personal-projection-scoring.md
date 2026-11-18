# MONEY-O4 개인 재무 구간 채점 — 체크리스트

루트 `requirements/specs/in-progress/MONEY-O4-personal-projection-scoring-slice.md` · 브랜치 `feat/fc-req-024-personal-projection-scoring` · 2026-11-18

## 1. 영역 검증

| 영역 | 명령 | 결과 |
|---|---|---|
| 예측 | `ruff check` · `ruff format --check` · `pyright` · `lint-imports` · `pytest -q` · `pytest tests/leakage` | 전부 통과 · pyright 0 · 계약 3 kept · 누수 50 |
| 예측 | `personal_scoring --dry-run --as-of 2026-06-30` · `ingest_market --only ecos --dry-run --as-of 2026-06-30` | 통과 · 물가 737개월(그 뒤 발표분 빠짐) |
| 플랫폼 | `./gradlew check`(Modulith · ArchUnit · Testcontainers) · `:app:bootJar` 실행 jar 로 재기동 | 통과 · 헬스 UP · Flyway savings 6 · household 11 |
| 플랫폼 | 저축 E2E 15 · 가계부 E2E 35 | 통과 — 예측 뷰 숫자 · 권한 회수 뒤 그 칸만 · 적립 저장 · 뷰 판정 = `LandingEngine.track` |
| BFF | `npm run build` · `npm test` | 0 오류 · 514/514 |
| 프론트 | `pnpm check-types` · `lint` · `test` | 13/13 |
| DB | Prisma `migrate deploy` 로컬 운영 · EXPLAIN 넷 | 0.08 · 0.08 · 인덱스 · 2.0ms |

## 2. 실데이터 · 실화면

| 확인 | 결과 |
|---|---|
| ECOS 실키 | 1965-01 ~ 2026-10 742개월 · 2026-10 분 알게 된 시각 = 보도 11-03 08:00 KST |
| 임시 계정(초대 코드 → 앱 삭제) | 목표 둘 · 적립 · 지출 → 발행 4건 사본 |
| 저축 상세 1440 · 390(앱 웹뷰 UA) | 적중 "12번 중 9번(3명)" · 오늘 돈 28,489,190원 · 31,590,928원 · +5.3% · 출처 |
| 가계부 월 1440 · 390 | 쌓인 적중 "15번 중 12번(3명)" |
| 못 읽음(서비스 계정 권한 회수 → 되돌림) | 두 화면 그 칸만 "불러오지 못했어요" · 화면 유지 |
| 기록 부족 · 6개월 전 | 이유 한 줄씩 |
| 콘솔 오류 · 가로 넘침 | 0 · 가계부 390 넘침 145px(이번 전부터) → 고친 뒤 0 |
| 계정 삭제 | 서비스 행 0 · 예측 사본 4 → 다음 채점 0 · 확인용 초대 코드 0 |

## 3. 사람 몫(done-checklist 2 · 3절)

- 같은 일을 하는 코드: 해시 식은 identity `V5__usage_day` 와 같은 식 · 월 합은 `monthSummary` 와 같은 식 · 시리즈 저장은 기존 `series_point`
- 임계(10건 · 6개월 · 20건 · 10%p)는 서버 · 예측에 — 화면은 문장만
- 공용 변경: `support` 없음. Kotlin 은 서비스 각자 어댑터(공유 0)

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 첫 실판정 · 실커버리지 숫자 | 실 DB 발행 0 | 가계부 다음 달 8일 · 저축 도달/늦은 끝 |
| 매일 배치 첫 회차 | 실행 트리는 머지 뒤 따라간다 | 머지 다음 날 `job_run` |
| 앱(RN) 화면 | 앱 셸 미착수 | `RN-REQ-033` · `034` |

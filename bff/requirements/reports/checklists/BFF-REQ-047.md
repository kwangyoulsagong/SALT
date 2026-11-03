# BFF-REQ-047 — 체크리스트

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

| FR | 구현 | 검증 |
|---|---|---|
| FR-1 · 2 · 3 · 5 · 8 | `app-savings.service.ts` · `savings.controller.ts` · `savings.routes.ts` | `app-savings.test.ts` 2(가공 0 · 경로 · id 인코딩) · 실스택 4011 → 4010(템플릿 · 계산 986,439 · 만들기 · 적립 · 목록 · 400 `SPLIT_TOO_FEW` 중계) · 4001 재시작 뒤 200 |
| FR-7 | `RETIRED_PATHS` 410 | `gone.middleware.test.ts` 4경로 · 실스택 `GET /api/goals/statistics` 410 |
| 홈 카드 | `/savings/home-card` | `app-home.test.ts` 1 추가(경로 · note "제주 여행 25.0%") · 실스택 |

미충족: 수용 기준 2 `degraded`(스펙 정정 줄) · FR-4 · 6(S1b).

- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

## 2026-11-03 — 미검증 닫기(사용자 "확인하지 못한 것은 베스트케이스")

- 수용 기준 2 `degraded`: `2c998117` — 서버 `ProjectionEngine.safely`(실패 주입 테스트 2) · 응답 `degraded` · `degradedReasons` · BFF 타입 전달 · 화면 이유 문장. 종단 10 · BFF 351 통과

## 2026-11-03 — 코드 리뷰(high) 10건 `c82be47c`

- `c82be47c` — 계약: `projection.issuedAt` 제거 · 이정표 상태 `reached` 추가(BFF 타입). 전달만
- 검증: Kotlin 종단 10(대소문자 중복 400 · 목록 = 상세 구간 · exists) · 도메인 19 · 경계 8 · 플랫폼 14 · 서버 936 · BFF 351 · 모노레포 check-types · lint · test · web-savings 빌드 · 훅 사후 · 실스택(프로브 done true/false)

## 2026-11-03 — MONEY-S1a 대조 빈칸(파일에 함께 적힌 REQ)

- `c60f5bfb` — 웹 `domain-savings` 의 조회 · 타입 파일이 이 계약(`/api/app/savings/*` 뷰모델)을 소비한다. BFF 무변경
- 확인: 해당 영역 전체 테스트 · 빌드(루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`)

## 2026-11-03 — MONEY-S1b

| 항목 | 검증 |
|---|---|
| 경로 5(저울 · 확정 · 비상시 · 단위 둘) | `app-savings.test.ts` — 메서드 · 경로 · 본문 그대로 · id 인코딩(`a/b` → `a%2Fb`) |
| 실스택 | BFF 4001 재시작 → platform 4010: 만들기 · 적립 · 단위 · 저울 · 비상시 200, 확정 200 · 기한 판정 칸 전달 |
| 빌드 · 테스트 | `npm run build` · `npm test` 352 통과 |
- 2026-11-03 `73973f79` `lastPayment` 칸 — build · test 352 · 셸 경유 화면에서 전달 확인(마지막 달 8,326원)

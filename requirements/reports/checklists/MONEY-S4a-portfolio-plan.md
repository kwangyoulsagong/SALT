# MONEY-S4a-portfolio-plan — 체크리스트

## 2026-11-26 — 구현 · 실스택 확인(drop 승인 대기)

브랜치 `feat/srv-req-049-s4-portfolio`. 영역 체크리스트: `salt-server/.../SRV-REQ-049.md` · `DB-REQ-036.md` · `SRV-REQ-028.md` · `SRV-REQ-029.md` ·
`bff/.../BFF-REQ-027.md` · `BFF-REQ-045.md` · `BFF-REQ-046.md` · `salt-microFe/.../FE-REQ-055.md` 외 파일만 걸친 REQ 13.

### 수용 기준(`SRV-REQ-049`)
- 골든 JSON 차이 0 — **이 조각 방식으로 충족**: 그림자 대신 옛 시험 기대값 50 사례 그대로 · 응답 키 · 순서 · 오류 코드 · 상세 키를 종단 시험이 본다(판단 2). 400 바디 `message` 문구만 다르다(미검증 표)
- 그림자 1주 무차이 — **해당 없음**(읽기 경로가 쓴다 — 은퇴 경로, `msa-services.md` §7)
- 수집 프로세스 · 판정 엔진 · 주문 경로 — S5 · S6 몫

### 검증(최종 작업 트리)
- Kotlin `./gradlew check` 통과(57초): `PlanPolicySpec` 50 · `PortfolioPlanEndToEndTest` 4 · `MyDataEndToEndTest`(서비스 목록에 portfolio · 표 전부 사람 행이거나 이유) · `ArchitectureTest`(Modulith · ArchUnit). 첫 회차 18 실패 = 시험 Postgres 연결 상한(풀 하나 늘어 300 넘음) → 500
- `bootJar` 실행 jar → 로컬 운영 DB: Flyway `portfolio` V1 성공 · 표 여섯(공통 셋 + plan 둘 + 이력)
- Express `npm run build` · `lint` · `npm test` 2002/2002(새 `weeklyPlanHeader` 11 · 코치 답 재료 3) · `test:layer-check` 10/6 · `prisma validate` · `prisma migrate status`(drop 하나만 대기)
- BFF `npm run build` · `npm test` 622/622(코치 재료 헤더 · `toWeeklyPlanFact` 6 · 내 데이터 아홉 곳)
- 데이터: 덤프(`pg_dump -Fc` 옛 표 둘 — 6 항목) → `portfolio-plan-import.sql` 대조 0 · 0 · 다시 돌려도 같음 · 권한 뷰 둘 t · 원본 표 f
- 실스택(임시 identity 계정 — 초대 코드 1장 · BFF 4001 → platform 4010 · Express 4000): 설정 전 · 읽기 전용 키 422 · 단위 422 · 첫 저장(시작 주 2026-11-23 · 주 150,000 × 2) · 이번 주 계획(관문 미통과 정액 · 김프 1.82% · 2,677원) · 지난 주 422 · 체크 → 연속 1 · 누적 150,000 · 이번 달 50% · 미래 달 400 · **코치 칩 "이번 주 얼마" → BFF 헤더 → "이번 주 적립 계획은 300,000원이에요 — 비트코인 150,000원 · 코스피 150,000원"** · `/me/privacy` · `/me/data-scope` 에 portfolio · BFF 계정 삭제 → 전체 18행 · portfolio 3행 → 남은 행 0 · 사용자 수 원래대로 1
- Express `/api/plan/weekly` 404(은퇴)

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 옛 public 표 drop(`20261126100100`) 적용 | 되돌리기 어려운 DB 변경 — 사용자 승인 대기(옛 표 0행 · 덤프 있음) | 사용자 승인 시 `prisma migrate deploy` |
| `/plan/weekly` 지연 p95 · 코치 재료 400ms 예산 적정성 | 측정 시점 머신 부하 평균 54(다른 프로젝트 빌드 CPU 1,588%) — 플랫폼 404 도 150~750ms 라 숫자가 근거가 못 된다. 첫 실스택 회차는 예산 초과로 "불러올 수 없어요"(설계대로 내려감), 부하가 내려간 뒤 두 회차는 계획 문장 | 부하 없는 때 다시 재기(머지 전) |
| 설정 화면 실화면(저장하는 것 · 지워지는 것에 "투자 적립") | 문구 한 줄 · BFF 응답까지만 확인 | 머지 전 셸 `/settings` 1280 · 390 |
| 400 바디 `errors[].message` 문구 | 옛 Zod 영어 문장을 흉내내지 않음(필드 경로 · 상태 · 코드는 같다) — BFF · 화면은 읽지 않는다 | 소비처가 생기면 |
| portfolio 보유 · 거래 · 평가 · `TransactionRecorded` | S4b~ | `SRV-REQ-049` FR-1 |

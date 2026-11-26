# MONEY-S4a-portfolio-plan — 체크리스트

## 2026-11-26 — 구현 · 실스택 확인 · drop 적용(사용자 "베스트케이스로 결정")

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
- **옛 표 drop(사용자 "베스트케이스로 결정")**: 덤프 `~/salt-backups/2026-11-26-public-plan-tables-before-drop.dump`(6,758B) → 임시 스키마 복원 시험(표 둘 · 행 0 = 원본 0) → `prisma migrate deploy` → public 표 없음 · portfolio 표 둘 · `migrate status` 최신
- **지연(부하 평균 1.84 — 재측정)**: 플랫폼 `/api/plan/weekly` p50 3 · p95 5ms(예산 250ms) · `/settings` p95 3ms · BFF `/api/app/plan/weekly` p95 26ms · 코치 답 첫 바이트 p95 16ms · 10회 모두 계획 문장(헤더 400ms 예산 안). 첫 측정(부하 54)의 504 는 머신 탓으로 판정
- **실화면**(셸 3100 dev — 이 트리 · 임시 계정 UI 로그인 · Chrome): `/settings` 1280 · 1024 "저장하는 것 — 투자 적립(금액: 주마다 적립 계획 금액 · 배수 · 직접 체크한 실행 금액, 밸류에이션 밴드 적립 월 적립액)" · "지워지는 것 — 투자 적립 — 월 적립액 · 주마다 적립 계획 · 체크" · 가로 넘침 0 · 콘솔 오류 0. 임시 계정 BFF 계정 삭제 → 남은 행 0 · 셸 운영 모드로 되돌림

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 휴대폰 `/m` 설정 화면 | `/m` 에 저장하는 것 · 계정 지우기 패널이 없다(데스크톱 셸만) | 휴대폰에 그 패널이 생길 때 |
| 400 바디 `errors[].message` 문구 | 옛 Zod 영어 문장을 흉내내지 않음(필드 경로 · 상태 · 코드는 같다) — BFF · 화면은 읽지 않는다 | 소비처가 생기면 |
| portfolio 보유 · 거래 · 평가 · `TransactionRecorded` | S4b~ | `SRV-REQ-049` FR-1 |

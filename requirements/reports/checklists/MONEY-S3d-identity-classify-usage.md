# MONEY-S3d 개인 데이터 등급 · AI 로 가는 것 · 도메인 사용 계측 — 체크리스트

루트 슬라이스 `requirements/specs/done/MONEY-S3d-identity-classify-usage-slice.md` · 브랜치 `feat/srv-req-048-s3d-identity-classify-metrics`

## 수용 기준

| 기준 | 상태 | 근거 |
|---|---|---|
| 내보내는 사람 표마다 등급 · 설명(빠지면 시험이 깸) | 충족 | 플랫폼 종단 `unclassified()` 0(서비스 여섯 + identity) · Express `userRows.test.ts` 마이그레이션 SQL 대조 · 변이(주석 하나 빠짐 · 민감 → 기록) |
| 감정 · 급여 · 사람 이름 = 민감 | 충족 | 종단 테스트 — `expense_tag` · `household_setting` · `person_entry` |
| AI 로 가는 것 = 프롬프트가 실제로 읽는 칸 · 사람 기록 0 | 충족 | `llmInputs.test.ts`(칸을 바꾸면 프롬프트가 바뀌는 칸 = 공개 목록 · 뉴스 주소 · 시각 미전송) · `ExplainCaller.userId: null` 타입 · 변이 둘 |
| 계측 — 금액 · 시각 · 사람 id 0 · 하루 한 행 · 계정 삭제 때 지움 | 충족 | 종단 테스트 · 실스택 임시 사용자(지운 뒤 `usage_day` 0 · 사용자 0) |
| 셀 수 있는 값은 서버 | 충족 | 모르는 도메인 · 종류 400(종단 · 실스택 · BFF 그대로) |
| 화면 — 저장하는 것 · AI 로 가는 것 | 충족 | 실화면 1440 · 390 웹뷰 · 로딩 · 실패 · axe 0 · 콘솔 오류 0 · 넘침 0 |
| 화면 — 방문 · 카드 클릭 | 충족 | 실스택 `card_click` · `visit` 각 +1(카드 → 투자 zone) |

## 검증

| 명령 | 결과 |
|---|---|
| `./gradlew check`(salt-platform) | 통과 — 종단 `MyDataEndToEndTest` 8/8 |
| salt-server `npm run build` · `lint` · `test` · `test:layer-check` | 통과 · 1300/1300 · 훅 차단 10 · 통과 6 |
| `npx prisma migrate deploy` · `prisma:generate` | 적용 · 생성 |
| bff `npm run build` · `npm test` | 통과 · 474/474 |
| salt-microFe `pnpm check-types` · `lint` · `test` | 13/13 · 13/13 · core 298 · ui 63 |
| 운영 빌드 zone 다섯(worktree) · main 나란히 | 5/5 · `/settings` 7.41 → 8.34 kB · `/home` 12.4 → 12.6 kB |
| 레이어 훅 사후 실행 | FE 15파일 exit 0(음성 대조 — 위로 향하는 import exit 2) · 서버 8파일 exit 0(음성 대조 — domain → `@prisma/client` exit 2) |
| EXPLAIN | upsert PK 중재 16ms · 주간 집계 18ms · 주석 읽기 7ms |
| 실스택 응답 | BFF `/api/app/me/privacy` 60ms(따뜻할 때) · 서비스마다 18~57ms |
| 변이 | 9/9 죽음(Express 4 · Kotlin 2 · BFF 3) — 사본으로 되돌림 |
| `node scripts/check-done.mjs` | 통과 |

## 결함 — 그 자리에서 고침

| 결함 | 고침 |
|---|---|
| identity 등급 경로가 클래스 머리(`/api/identity/me`)와 겹쳐 `/api/identity/me/api/identity/…` 가 될 뻔(앞 세션 시작분) | 모든 서비스 `/api/<service>/me/data-classification` 로 맞춤 |
| 실화면 — 항목 구분 " · " 가 설명 안 " · " 와 같아 끊기는 곳이 안 보임 | 쉼표 |
| FR 번호 겹침(BFF FR-9 · FE FR-8 이 이미 있었다) | BFF FR-10 · 11 · FE FR-9 로 정정(코드 주석 11곳) |
| `ops/salt.sh` 에 금융 팁 zone 없음 | 이름 표 · `DEV_APPS` |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 결제 문자 원문 미보관(FEATURE-015 FR-5 첫 줄) | 결제 문자 입력 자체가 없다 | 결제 문자 입력이 생길 때 |
| 앱(RN) 설정 화면 | 앱 셸 미착수 | `RN-REQ-035` |

# MONEY-S3b identity 계정 · 토큰 — 체크리스트

루트 슬라이스 `requirements/specs/in-progress/MONEY-S3b-identity-accounts-slice.md` · 브랜치 `feat/srv-req-048-s3b-identity-users`

## 수용 기준

| 기준 | 상태 | 근거 |
|---|---|---|
| 기존 사용자 · 초대 코드 행 수 이동 전후 같음(`DB-REQ-040`) | 충족 | `identity-import.sql` 대조 — 사용자 5 · 코드 6 · 시도 6(id · 이메일 · 해시 · 생성 시각 · 코드 사용자까지 같아야 셈) · 두 번 돌려도 같은 결과 |
| 이중 검증 기간 옛 · 새 토큰 모두 통과, 종료 후 옛 토큰 401(`SRV-REQ-048`) | 충족(시험) · 실제 종료는 11-27 | `DualTokenVerifierSpec` 9 · `tokenVerifier.test.ts` 10(끝 시각 정각 401 · 1초 전 통과) · 실스택: 옛 HS 로 Express · 플랫폼 · `/auth/me` 200 |
| 초대 코드 시도 제한 · 감사 로그 그대로 | 충족 | 1분 30 · 1분 10 · 게스트 10분 300(옛 수) · 시도 기록 앞 4자(`IdentityAccountsEndToEndTest`) |
| 정원 미노출 · 이메일 겹침은 코드를 소모하지 않음 · `register` 404 | 충족 | 종단 테스트 |
| 같은 코드 동시 수락 — 계정 하나 · 이벤트 하나 | 충족 | 종단 테스트(4 동시) |
| 받는 쪽이 다른 토큰 차단(갱신 → API · 접근 → 갱신 · 게스트 → 사람) | 충족 | 두 경계 표 · 종단 · 실스택(BFF 경유 401 셋) |
| BFF · 화면 무변경 | 충족 | 응답 모양 대조(종단 — 칸 이름 · 순서 · 밀리초 시각 · zod 문구) · BFF 코드 무변경(라우팅 표 값 둘) · 실화면 로그인 |

## 검증

| 무엇 | 결과 |
|---|---|
| `./gradlew check`(Modulith · ArchUnit · Testcontainers) | 통과 274(공개 경로 고침 뒤 영향 셋 다시 — 계정 7 · 플랫폼 14 · 팁 9 통과) |
| Express `npm run build` · `lint` · `npm test` · `test:layer-check` | 통과 · 1286/1286 · 차단 10 통과 6 |
| BFF `npm run build` · `npm test` | 통과 · 457/457 |
| 레이어 훅 사후 실행(Bash 로 쓴 Express 11 파일) | 위반 하나 넣은 음성 대조 exit 2 먼저 → 11 파일 exit 0 |
| 실행 jar | `bootJar` → `ops/salt.sh restart platform` → Flyway V2 · JWKS 공개(개인 칸 0) |
| 덤프 · 복원 | `pg_dump -Fc` 세 표 → 새 DB 에 복원 5 · 6 · 6 → 삭제 |
| 실스택(BFF 4001) | 가입(새 발급 스크립트 코드) · 로그인 · RS256(kid) · `/auth/me` · 프로필 · Express 포트폴리오 · 관심 · 플랫폼 저축 · 온보딩 200 · 갱신 = RS · 뒤바꾼 토큰 401 · 게스트 국내 요약 200 · 게스트 포트폴리오 401 · 옛 HS 셋 200 · `UserRegistered` 발행됨 |
| 실화면(셸 임시 포트 3010 — 3000 은 다른 프로세스) | 로그인 → `/home` 카드 넷(저축 · 가계부 · 투자 · 팁) · 이름 · API 4xx 0 · 콘솔 오류 0 · 접근 쿠키 지우면 갱신 쿠키로 새 RS256 |
| 임시 사용자 | 만들고 identity 세 행(계정 · 시험 코드 · 아웃박스) 삭제 — 5 · 6 으로 복귀 |

## 확인 중 본 결함 — 그 자리에서

| 결함 | 원인 | 고침 |
|---|---|---|
| BFF 경유 로그인 401 `Invalid token` | 프록시가 공개 경로에도 `Bearer undefined` — Spring 은 공개 경로라도 실린 토큰을 검증 | 플랫폼 공개 경로는 `Authorization` 을 읽지 않음(Express 와 같게) + 종단 테스트 |
| 발급 스크립트 exit 141 | `tr \| head` 가 `pipefail` 아래 SIGPIPE | 함수 안에서만 `nopipefail` |
| 발급 스크립트 표 없음 | 서비스 계정 기본 search_path 가 public | `PGOPTIONS=-c search_path=identity` |
| 사람 경로의 만료 게스트 토큰이 `Token expired` | 만료 판정이 종류 판정보다 먼저 | 게스트 모양이면 만료여도 `Invalid token`(옛 동작) |
| 새 계정의 Express 쓰기 FK 위반(Whale Signals) | 마이그레이션(FK 끊기) 미적용 상태 | 적용은 승인 대기 — 임시 계정 삭제로 일관성 복귀 |
| 리밸런스 P2002(이 브랜치 전부터 374회) | Prisma `upsert` = 조회 → 생성, 같은 사람 회차가 겹침 | 없으면 넣기(ON CONFLICT DO NOTHING) → 갱신 → 읽기 · 16:10 회차 `✅ Investment insights generated successfully`(리밸런스 실패 0) |
| Smart Buy Zones FK 위반(이 브랜치 전부터 73회) | 전역 인사이트를 `userId: "global"` 로 쓰는데 그런 사용자 행이 없다 — `users` FK 가 막음 | FK 끊기 마이그레이션(`DB-REQ-036` B1)이 이 꼴 전체를 닫는다 — 적용 승인 대기 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~Prisma 마이그레이션 적용 · 적용 뒤 새 가입자의 Express 쓰기~~ | **닫힘 2026-11-12** — 사용자 "다해" 뒤 적용: 사용자 FK 0 · 옛 표 셋 없음 · 원장 행 그대로 · identity 에만 있는 임시 계정의 관심 추가 201(전엔 FK 위반) · 임시 계정 양쪽 삭제(5 · 6 복귀) | — |
| 옛 HS 종료 실측(서명 맞는 옛 토큰 401) | 끝 시각이 11-27 | 2026-11-27 — HS 코드 · 비밀 삭제와 같이 |
| Smart Buy Zones `global` 행이 실제로 쓰이는 것 | 적용 뒤 16:20 회차는 실패 0(`✅ Investment insights generated successfully`)이지만 후보가 없어 `global` 행 0 — FK 는 이제 없어 막을 것이 없다 | 후보가 생기는 회차(`investment_insights` user_id='global' 행) |


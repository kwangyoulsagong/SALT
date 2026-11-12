# MONEY-S3c 내 데이터 내보내기 · 계정 삭제 — 체크리스트

루트 슬라이스 `requirements/specs/done/MONEY-S3c-identity-my-data-slice.md` · 브랜치 `feat/srv-req-048-s3c-identity-export-delete`

## 수용 기준

| 기준 | 상태 | 근거 |
|---|---|---|
| 내보내기 zip 에 모든 도메인 기록(`SRV-REQ-048` · FEATURE-015) | 충족 | 실스택 BFF 경유 — 8 서비스 · 52 표 · README · `all.json` · 남의 id 0 · 비밀번호 0 · 0.17s |
| 계정 삭제 뒤 그 사람 행 0 · 남의 행 그대로 | 충족 | 종단 테스트(`remaining` 빈 · 남의 것 전후 같음) · 실스택: 모든 `user_id` 칸 훑기 0 · 아웃박스 0 · LLM 호출 사람 칸 0 · 다른 사용자 그대로 |
| 재인증 — 접근 토큰만으로 못 지움 · 틀린 비밀번호 403 · 다른 사람 허가 403 | 충족 | 종단 테스트 · 경계 표 둘(Kotlin · Express) · 실스택 403 `REAUTH_FAILED` · 빈 비밀번호 400 |
| 삭제 범위 표시 | 충족 | 실화면 `/settings` 계정 지우기 패널 |
| 삭제 기록에 사람 값 0 · 서비스별 행 수 | 충족 | 종단 · 실스택(기록 `counts` 에 id · 이메일 0) |
| 지운 계정 갱신 401 · 로그인 401 | 충족 | 종단 · 실스택 |
| 발행 원장 — 허가된 지우기만 DELETE · UPDATE 는 늘 막힘 | 충족 | 종단(밖 DELETE · 표지 켠 UPDATE 둘 다 append-only) |

## 검증

| 무엇 | 결과 |
|---|---|
| `./gradlew check`(Modulith · ArchUnit · Testcontainers) | 통과(커밋 뒤 다시) · `MyDataEndToEndTest` 5 |
| Express `npm run build` · `lint` · `npm test` · `test:layer-check` | 통과 · 1294/1294 · 레이어 검사 통과 |
| BFF `npm run build` · `npm test` | 통과 · 465/465 |
| 프론트 `check-types` · `lint` · `pnpm test` · `test:layer-check` · 셸 운영 빌드(worktree) | 통과 · `/settings` 153kB |
| 레이어 훅 사후 실행(Bash 로 쓴 프론트 17 · Express 10 파일) | 음성 대조(위반 하나) exit 2 둘 먼저 → 27 파일 exit 0 |
| 변이(사본으로 되돌림) | 8/8 — 허가 검사 뺌 · 다른 사람 허가 × 2 · 표 하나 뺌 × 2 · 갱신이 계정을 안 봄 · 원장 예외를 UPDATE 까지 · BFF 일부만 내보내기 · 중간 실패 삼킴. 처음엔 둘이 살아남아 시험을 더했다(`cdf8ce86`) |
| 실행 jar · 로컬 운영 DB | `bootJar` → `ops/salt.sh restart platform` — identity V3 · savings V4 · household V9 적용 |
| 실스택(BFF 4001) | 임시 사용자 둘 — 내보내기 → 틀린 비밀번호 403 → 삭제 0.54s(16행) → A 0 · B 그대로 · 갱신 A 401 · B 200 |
| 실화면(셸 3000 — SALT dev) | Playwright 1440 · 390(앱 UA) — 내려받기 파일 이름 · "파일을 받았어요" · 틀린 비밀번호 안내 · "기록 N개와 계정을 지웠어요" · 쿠키 0 · 처음 화면. 콘솔 오류는 일부러 친 403 하나 |
| 시험 산물 정리 | 임시 계정 0 · 시험 초대 코드 5 삭제 · 삭제 기록 3행 삭제 |

## 결함 — 확인 중 찾아 고침

| 결함 | 고침 |
|---|---|
| 내보내기 시각이 DB 세션 시간대(+09:00)로 나옴 — README 는 "UTC" | `UserRows` 가 `OffsetDateTime` 을 UTC Instant 로 · 종단 단언 |
| 갱신 토큰이 지운 계정에 새 접근 토큰을 줌(서명만 봄) | 갱신이 계정 존재를 본다 · 종단 단언 · 변이 |
| Express "다른 사람 허가" 거름 · 원장 예외 범위가 시험 0 | 판정 함수 `grantedUserId` 경계 표 · 표지 켠 UPDATE 단언 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 분류 · 계측 | S3d 로 나눔 | 서버 S3d |
| 삭제 직후 다른 기기의 접근 토큰(최대 15분) | 서명만 보는 토큰 — 폐기 목록 없음 | 배포 `OPS-001` 때 판단 |
| 앱(RN) 화면 | 앱 셸 미착수 | `RN-REQ-035` |

# MONEY-S3a — identity 셸 설정 · 도메인 선택 온보딩 · 홈 카드 배치 — 체크리스트

슬라이스 `requirements/specs/done/MONEY-S3a-identity-shell-slice.md`. 커밋 `fc0207cb` · `7f2ba1ed` · `066ba971` · `c1baa77a`.

## 1. 기계 검증

| 영역 | 명령 | 결과 |
|---|---|---|
| 플랫폼 | `./gradlew check` | 통과 — `ShellPrefsSpec` 6 · `IdentityShellEndToEndTest` 6 · 기존 전부(권한 검사 표본 `portfolio.probe` 로 옮김) |
| 플랫폼 | `./gradlew :app:bootJar` + launchd 재기동 | health ok · Flyway identity V1 · 표 다섯 |
| Express | `npm run build` · `lint` · `test` · `test:layer-check` | 통과 · test 925 · 차단 10 · 통과 6 |
| BFF | `npm test` · `npm run build` | 412/412 · 빌드 통과 |
| FE | `pnpm check-types` · `lint` · `test` · `test:layer-check` | 13/13 · 13/13 · core 184 · ui 46 · 차단 16 · 통과 10 |
| 레이어 훅 사후 | Bash 로 쓴 barrel · 설정 페이지 · 엔티티 파일 16 + 고친 패널 4 | 위반 0 |
| done 검사 | `node scripts/check-done.mjs` | 아래 §4 |

- 셸 web 운영 빌드(worktree 둘 — 상시 dev `.next` 무관, main 과 나란히): `/home` 159 → **160 kB**(+1) · `/onboarding` 151 → **153 kB**(+2) · `/settings` 148 → **150 kB**(+2) · 공용 103 그대로 — 예산(+40) 안

## 2. 실스택 · 실화면(임시 사용자 — 끝나고 identity · notification 행 삭제, 0행 복귀)

| 확인 | 결과 |
|---|---|
| 로그아웃 `/onboarding` | 초대 단계 |
| 웹뷰 390 — 고르기 → "다음" 비활성(빈 선택) · 쓰는 돈만 → 첫 기록 화면에 투자 · 거래 글자 0 → `/household/new` 도착 | 통과 |
| 네 길 — 모으기 → `/goals/new` · 투자 → `/investments` · 모으기+투자 → `/goals/new` · 쓰는 돈 → `/household/new` | 통과 · DB `chosen_domains` · `onboarded_at` 일치 |
| 홈(1280) — 고른 뒤 가계부 카드만 · 온보딩 안내 카드 사라짐 | 통과 |
| 설정 — 투자 보이기 켬 → 홈에 투자 · 위로 · 아래로 → 홈 순서 | 통과(PUT 본문 · 응답 넷 칸) |
| 연달아 — 토글 · 위로 · 위로 기다리지 않고 셋 → PUT 셋 차례로 · 최종 순서 맞음 · 알림 두 도메인 연속 → 새로고침 뒤 둘 다 켜짐 | 통과(고친 뒤) |
| 옛 `/api/app/onboarding/status` | 410 |
| 넘침 1024 · 1280 · 1440 · 1600 × `/onboarding` · `/settings` · `/home` · 390 웹뷰 고르기 · 첫 기록 | 0 |
| axe(wcag2a · aa) 고르기 · 첫 기록 · 설정 | 새 요소 0 — 기존 공용 패널 설명글(알림 · 투자 패널) 3.03:1 은 기존 결정(범위 밖 표) |
| 콘솔 오류 | 0(로그인 · 데스크톱 · 네 길). 한 번 본 `/household/new` 수화 경고는 도착 직후 스크린샷이 수화 중에 끼어든 것 — 스크린샷 없이 다시 열어 0 |

## 3. 결함

| 결함 | 원인 | 고침 |
|---|---|---|
| 설정 패널이 저장 중 누른 것을 버림(토글 직후 "위로" · 알림 둘째 도메인) | `if (!isPending) mutate()` 가드 — 새 패널이 S2c 알림 패널을 본떴다 | 같은 묶음 `scope` 로 차례 저장 · 마지막 저장만 서버 값(`useArrangeHome` · `useToggleAlert`) |
| 새 패널 설명글 대비 3.03:1 | 공용 `panelDescription` 회색 500 | 새 패널만 2단 글자색(기존 패널은 그대로) |
| 만료 세션으로 연 `/onboarding` 이 "불러오는 중"에 머묾(2회차) | 조회가 일반 `Error` → 401 도 재시도 · 공개 경로라 로그인으로 안 보냄 | `readApiError` · 401 = 세션 없음 → 초대 단계 `698da12b` |

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 앱 웹뷰 실기기 | 앱 미착수 — 웹뷰 UA 390 으로 대신 렌더 | `RN-REQ-035` |
| 사용자 표 이동 · 토큰 · 내보내기 · 삭제 | S3b · S3c 몫 | 슬라이스 범위 밖 표 |

## 2026-11-06 — 서버 S3a 확인 2회차

- 다시 돌림(마지막 코드 커밋 `698da12b` 기준): `./gradlew check`(저축 `/goals/exists` 삭제 뒤 처음 — app 91 · 서비스 159, 실패 0) · FE `check-types` · `lint` · `test` · `test:layer-check` · springdoc 에 identity 경로 넷 · 저축 `/goals/exists` 0 · Express 옛 `/api/onboarding/status` 404
- 실패 · 만료 경로(Playwright `route` · 만료 토큰, 셸 3001 — 3000 은 사용자 회사 작업): 불러오기 500 → 재시도 뒤 "불러오지 못했어요" · 고르기 500 → 문구 · 끝내기 500 → 문구 + 이동 안 함 · 배치 저장 500 → 토글 되돌림 + 문구 · 만료 세션 `/settings` · `/home` → 로그인 · 새 홈 카드 패널 axe 0
- **결함 1** — 만료 세션으로 `/onboarding`(공개 경로)을 열면 "불러오는 중"에 머물렀다: 조회가 일반 `Error` 를 던져 401 도 재시도 대상. `readApiError` + 401 = 세션 없음 → 초대 단계 `698da12b`. 같은 원인 grep — 초대 확인(`acceptInviteApi.check`)도 일반 `Error` 지만 `retry: false` 라 결함 아님

# FE-REQ-055 — 셸 홈 요약 카드 — 체크리스트

스펙: `salt-microFe/requirements/specs/in-progress/FE-REQ-055-F015-SHELL-HOME.md` · 2026-11-02
브랜치: `feat/fe-req-053-invest-zone-home-cards` (base `main` `166b6f49`) · 루트 슬라이스 `requirements/specs/done/MONEY-F1-invest-zone-home-cards-slice.md`

## 1. FR ↔ 구현

| FR | 구현 | 상태 |
|---|---|---|
| FR-1 | `packages/core/src/home/homeSummaryCard.ts`(BFF 와 글자 대조) · `apps/web/src/entities/home`(`homeApi` · `useHomeCards` · `HomeSummaryCardView` — `ZoneLink`) | ✅ |
| FR-2 | `widgets/home-briefing` — 카드 목록(BFF `order` · `hidden`) + 목표 목록(임시) + 저축 팁 | 일부 — 순서 · 숨김 편집 없음(S3) |
| FR-3 | — | 미착수(`FE-REQ-048`) |
| FR-4~7 | — | 미착수(S3) |
| FR-8 | 문구 grep 0 | ✅ |

## 2. 검증 (실행한 것만)

| 확인 | 결과 |
|---|---|
| check-types · lint · build · 훅 | 통과(FE-REQ-053 체크리스트와 같은 실행) |
| 실화면 카드 | 저축 "모은 돈 0원 · 진행 중인 목표 1개" · 투자 "보유 평가 1,056,640원 · 손익률 +5.7%"(숨김 끔) / "보유 종목 1개 · 오늘 처음 본다면…"(숨김 켬, 카드 `note` — `0f8683f8`) |
| 카드 하나 degraded(Playwright route) | 투자 "지금은 불러오지 못했어요" · 0원 표시 없음 |
| 만료 토큰 | `/home` → `/`(로그인) — main 과 같다 |
| 가로 넘침 1024~1600 | 0 |

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 카드 순서 · 숨김 편집 | 저장할 서버(identity)가 없다 | S3 `SRV-REQ-048` · `BFF-REQ-046` FR-5 |
| 온보딩 · 내 데이터 · 알림 · 개인정보 | 같은 이유 | S3 |
| 데스크톱 홈 배치(FR-3) | `FE-REQ-048` to-do | `FE-REQ-048` |
| 홈 목표 목록 제거 | 저축 목록 화면이 없다 | `FE-REQ-056` |
| 카드 서버 렌더 · 카드별 스트리밍 | 토큰이 `localStorage` | `FE-REQ-013` |

- 2026-11-02 MONEY-F1 후속 — `0f8683f8` — 카드 계약에 값 아래 한 줄 `note` 추가(BFF · `@repo/core/home` 같이). 투자 카드가 매입가 숨김을 켰다고 확인된 사람에게 "오늘 처음 본다면" 줄 — 셸 카드가 값 아래 그린다. 실화면 켬/끔 확인

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 앱 내비게이션

- 셸 홈 머리 — 프로필 메뉴가 화면이 아니라 공용 머리에서 온다(`e0bce695`). 홈 카드 계약 · 순서 무변경
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행 · Storybook · 실화면(5화면 × 5폭 · 앱 웹뷰 · WebKit) — `salt-microFe/requirements/reports/checklists/FE-REQ-054.md` §2

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 이 REQ 에 걸린 몫(`c60f5bfb`): 홈 임시 목표 목록(`GoalsBlock`) 삭제 — `/goals` 가 생겼다. 홈 경계 2 → 1
- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- [x] 실스택 홈 카드 셋(저축 · 가계부 · 투자)


## 2026-11-05 — FE-REQ-013 FR-80 2단계 확인 단계(주석 정정)

- FE-REQ-013 FR-80 2단계 확인 단계: 이 REQ 가 주인인 화면 파일의 낡은 이유 주석("토큰이 `localStorage` 라 클라이언트")에 정정 문장(`95829941`, 주석만 · 동작 0). 서버 조회 이관은 `FE-REQ-013` FR-81(국내 주식은 약관상 대상 아님). 루트 `requirements/specs/done/F000-cookie-session-slice.md`
- 확인: lint · check-types(web · domain-invest) · 훅 사후 실행 · 실화면(해당 화면 200 · 401 미해결 0 · 수화 오류 0)

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 몫: FR-6 — 패널 · 낙관적 저장(실패면 되돌림) · 자리 칸 줄 셋 높이 · 조회 재시도 1
- 검증: check-types · lint · 레이어 훅 사후 · 실화면 사용자 넷(루트 체크리스트) · 셸 운영 빌드 `/settings` 146 → 148 kB(worktree, main 과 나란히)
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S2c 확인 2회차

- 확인 2회차(`94bbed43`): axe — 새 줄 설명 대비 3.03 → 2단 글자색(위반 0) · `pnpm test` · `test:layer-check` 16/10 · 실화면 다시

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`) · `c1baa77a`

- FR-4: `entities/auth`(계약 `Onboarding` · `useOnboarding`) · `features/choose-domains`(고르기 폼 · 끝내기) · `widgets/onboarding-flow`(초대 · 고르기 · 첫 기록 · 끝 · 홈 안내 카드)
- FR-2: `features/arrange-home` 패널(위로 · 아래로 · 보이기 토글) — `/settings`
- 고침(같은 원인 둘): `toggle-alerts` · `arrange-home` 이 `isPending` 동안 누른 것을 버렸다 → `scope` 직렬화 + 마지막 저장만 서버 값. 실화면 연달아 세 번 · 알림 둘 연속 → 다 저장 · 새로고침 유지
- 검증: `pnpm check-types` · `lint` · `test`(core 184 · ui 46) · `test:layer-check` 16/10 · 실화면 390(웹뷰) · 1024 · 1280 · 1440 · 1600 넘침 0 · axe 새 요소 위반 0(고르기 · 첫 기록 · 설정 패널) · 콘솔 오류 0
- 남은 것: 공용 `panelDescription`(회색 500, 3.03:1) — 기존 패널 둘은 그대로(기존 결정, 새 패널만 2단 글자색)
- 셸 web 운영 빌드(worktree 둘 — 상시 dev `.next` 무관, main 과 나란히): `/home` 159 → **160 kB**(+1) · `/onboarding` 151 → **153 kB**(+2) · `/settings` 148 → **150 kB**(+2) · 공용 103 그대로 — 예산(+40) 안

## 2026-11-06 — 서버 S3a 확인 2회차

- 다시 돌림(마지막 코드 커밋 `698da12b` 기준): `./gradlew check`(저축 `/goals/exists` 삭제 뒤 처음 — app 91 · 서비스 159, 실패 0) · FE `check-types` · `lint` · `test` · `test:layer-check` · springdoc 에 identity 경로 넷 · 저축 `/goals/exists` 0 · Express 옛 `/api/onboarding/status` 404
- 실패 · 만료 경로(Playwright `route` · 만료 토큰, 셸 3001 — 3000 은 사용자 회사 작업): 불러오기 500 → 재시도 뒤 "불러오지 못했어요" · 고르기 500 → 문구 · 끝내기 500 → 문구 + 이동 안 함 · 배치 저장 500 → 토글 되돌림 + 문구 · 만료 세션 `/settings` · `/home` → 로그인 · 새 홈 카드 패널 axe 0
- **결함 1** — 만료 세션으로 `/onboarding`(공개 경로)을 열면 "불러오는 중"에 머물렀다: 조회가 일반 `Error` 를 던져 401 도 재시도 대상. `readApiError` + 401 = 세션 없음 → 초대 단계 `698da12b`. 같은 원인 grep — 초대 확인(`acceptInviteApi.check`)도 일반 `Error` 지만 `retry: false` 라 결함 아님

## 2026-11-12 — 서버 S3c 내 데이터

루트 `requirements/specs/done/MONEY-S3c-identity-my-data-slice.md`

| 바뀐 것 | 확인 |
|---|---|
| FR-5 `export-my-data` · `delete-account` · `/settings` | 타입 · lint · 셸 운영 빌드(worktree) · 레이어 훅 사후 실행 · 실화면(Playwright — 내려받기 파일 이름 · 틀린 비밀번호 · 지움 결과 · 쿠키 0 · 처음 화면 · 390 · 1440 · 콘솔 오류는 일부러 친 403 하나) |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-7 LLM 전송 필드 화면 | 서버 분류 표가 S3d | 서버 S3d |
| 앱(RN) 내 데이터 화면 | 앱 셸 미착수 | `RN-REQ-035` |

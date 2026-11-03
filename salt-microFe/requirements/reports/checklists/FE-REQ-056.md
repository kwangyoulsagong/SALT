# FE-REQ-056 — 체크리스트


## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — 셸 홈 → 도메인 요약 카드(투자 블록 · 매입가 숨김 잎 삭제)(`417076d8`). 파일 1개(경로 이동 내용 무변경 0 · 수정 1 · 추가 0 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 앱 내비게이션

- 이 REQ 에 걸린 몫(`FE-REQ-054`) — 저축 탭은 `@repo/core/navigation` `APP_TABS` 에서 `readyBy: "FE-REQ-056"`(비활성 "준비 중"). 저축 첫 화면(`/goals`)이 생기면 `readyBy: null` 로 · zone 레이아웃에 `AppShell` + `VIEW_TRANSITION_CSS`(투자 zone 레이아웃과 같은 꼴) · `next.config.js` 를 vanilla-extract 로 감싼다
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행 · Storybook · 실화면(5화면 × 5폭 · 앱 웹뷰 · WebKit) — `salt-microFe/requirements/reports/checklists/FE-REQ-054.md` §2

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

| FR | 구현 | 검증 |
|---|---|---|
| FR-1 | `packages/domain-savings` · `apps/web-savings` · 레지스트리 · `APP_TABS` · 셸 삭제 | check-types · lint · zone 5 빌드(`/goals` 146 kB · `/goals/new` 125 kB · `/goals/[id]` 146 kB First Load) · core 테스트 83(레지스트리 · 탭 갱신) |
| FR-2 · 3 | `AddGoalForm` | 실화면: 결혼 · 3천만 · 2028-11-01 → "매달 넣을 돈 1,250,000원 · 24개월 · 2028년 11월" → 만들기 → 상세 이동 |
| FR-4 | `DepositForm` · `SplitDepositForm` | 실화면: 125만 적립 → "기록했어요" · 진척 4.1% · 이정표 차이 0원 · 최근 적립 1건 |
| FR-5 · 7 | `ProjectionLine` · `MilestoneBox` · `GoalCard` | 실화면: "계획대로면 2028년 10월" + 이유 + 채점 대기 |
| 화면 틀 | `AppShell` 안 div | 1024 · 1280 · 1440 · 1600 × 3화면 가로 넘침 0 · 콘솔 오류 0 · `<main>` 중첩 발견 → 고침 |
| 금지어 · 계산 | grep | 금지어 0 · `/ 100 · Math.` 0(`b1c8ad67`) |

미충족: FR-13 서버 렌더(`FE-REQ-013`) · FR-2 첫 도장 · FR-4 모션 · FR-5 팬 차트 · FR-6 · 8~12(S1b). 앱 웹뷰 390 · 셸(3000) 경유 실측 — 3000 을 다른 프로젝트가 쓰고 있어 zone 3003 직접(셸 rewrites 는 레지스트리 생성이라 경로만 다름).

- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`
- 번들(Next 표 First Load, 운영 빌드): 저축 zone 새 화면 `/goals` 146 · `/goals/[id]` 146 · `/goals/new` 125 kB(공용 102) · 셸 `/home` 158 → 154 kB(F2 기록 대비 — 임시 목표 목록 · `goal` store 삭제) · 투자 zone 무변경

# BFF-REQ-046 — 셸 홈 요약 카드 — 체크리스트

스펙: `bff/requirements/specs/in-progress/BFF-REQ-046-F015-SHELL.md` · 2026-11-02
브랜치: `feat/fe-req-053-invest-zone-home-cards` (base `main` `166b6f49`) · 루트 슬라이스 `requirements/specs/done/MONEY-F1-invest-zone-home-cards-slice.md`

## 1. FR ↔ 구현

| FR | 구현 | 상태 |
|---|---|---|
| FR-1 | `services/app-home.service.ts`(`CARD_SOURCES` · `allSettled`) · `home-card.viewmodel.ts` | ✅ |
| FR-2 | `CONTRACT` 블록 ↔ `@repo/core/home` · `__tests__/home-card-contract.test.ts` | ✅ |
| FR-3 | `withinBudget` 800ms | ✅ |
| FR-4 | 투자 카드 — 보유 평가 + 손익률(숨김 끔) / 종목 수 + `note`(숨김 켬) | ✅(F003 · 도메인 선택은 없음) |
| FR-5~8 | — | 미착수(S3) |
| FR-9 | 옛 블록 응답 삭제(소비처 0) | ✅ |
| 추가 | 401 은 홈 401(`5b6d5320`) | ✅ |

## 2. 검증 (실행한 것만)

| 확인 | 결과 |
|---|---|
| `npm run build` · `npm test` | 통과 · 324(최종 HEAD 재실행 — 루트 체크리스트) |
| 홈 테스트 | 11 — 카드 · empty · degraded · 800ms · 손익률(끔 · 음수 · 켬 · 설정 실패 · 통계 실패) · 401 · `note`("오늘 처음 본다면" — 켬에만, `0f8683f8`) |
| 변이 | 계약 필드 하나 → 대조 테스트 실패 · 숨김 판정 지움 → 실패 1 · 401 재던지기 지움 → 실패 1 |
| 실서버(임시 사용자) | 카드 2 · 숨김 끔 "+5.7%" → 켬 "보유 종목 1개" → 끔 "+5.7%"(독립 계산 1,056,640/1,000,000−1 = 5.66%) · 잘못된 토큰 401 · 정상 200 |
| 프론트 소비처 | 웹 셸 홈 하나(`entities/home`) — 옛 응답을 읽던 곳 0(`grep "/api/app/home"`) |

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 레이아웃 저장 · 온보딩 · 내보내기 · 알림 | 서버 identity 없음 | S3 `SRV-REQ-048` |
| 가계부 · 팁 카드 | 서비스 없음 | `SRV-REQ-046` · `047` |
| 모바일 1콜 소비 | RN 미착수 | `RN-REQ-035` |
| 웹 블록별 엔드포인트(`bff-architecture.md` §4) | 웹 홈이 토큰을 서버에서 못 읽어 한 번 부른다 | `FE-REQ-013` |

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 이 REQ 에 걸린 몫(`3e5e0d42` · `b1c8ad67`): 저축 카드 원천 `/goals/statistics` → `/savings/home-card` · `href` `/goals/addgoals` → `/goals` · `note` = 진척이 가장 큰 진행 중 목표 한 줄(서버 퍼센트 그대로). 테스트 1 추가
- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- [x] 테스트: 순서 셋 · 넘친 예산 "-3,000원"(경고 0) · 예산 없음 → 구간 · 구간 없음 → 비움 · empty
- [x] 실스택 홈: 가계부 ok "13,000원 / 297,000원"


## 2026-11-05 — FE-REQ-013 FR-80 2단계 쿠키 세션

- 파일만 걸침 — `apps/web/src/entities/home/api/homeApi.ts`(이 REQ 가 머리 주석 주인)에서 토큰 헤더(`authHeader()`)를 뺐다 · 로그인 여부 `useHasSession`. 토큰은 httpOnly 쿠키 · 같은 origin 이라 브라우저가 싣는다(`721063fc`). 화면 · 동작 무변경
- 확인: check-types · lint · test · zone 4 빌드 · 훅 사후 실행 · 실스택 — `salt-microFe/requirements/reports/checklists/FE-REQ-013.md` 2026-11-05

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 몫: FR-8 · `me.routes` · `app-alerts.service`(설정 GET/PUT · 경로 `/notifications`) · 알림 뷰모델 종류 셋
- 검증: `npm run build` · `npm test` 404(새 3) · 실스택 curl(없는 도메인 400 그대로 전달)
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`) · `066ba971`

- FR-5: `app-home.service` `arrangeHome`(모르는 칸 뒤에 붙임) · `PUT /api/app/home/layout`
- FR-6: `onboarding.viewmodel` 새로 · `app-onboarding.service` `get` · `chooseDomains` · `finish` · 라우트 셋 · 옛 `/status` 은퇴(`RETIRED_PATHS`)
- FR-4: 홈 배치를 identity 에서 — 카드와 나란히 `allSettled`, 배치 실패 = 기본 순서(카드 실패 아님) · 401 = 홈 전체
- 검증: `npm test` 412 · `npm run build` · 실스택(옛 경로 410 · 배치 저장 PUT 본문 셋 차례로)

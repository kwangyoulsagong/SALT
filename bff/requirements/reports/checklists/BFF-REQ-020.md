# BFF-REQ-020 checklists

## 2026-11-19 F003 v2 순서 3

- 구현 위치: BFF `services/plan.viewmodel.ts`(계약 · fail-closed) · `app-plan.service.ts` · `rest/{routes,controllers}/plan.*` · 홈 `app-home.service.ts` · `home-card.viewmodel.ts` · `utils/error.util.ts`(422 경계 옮김) — 프론트 `@repo/core/plan` · `entities/plan` · `features/{complete-weekly-plan,edit-plan-settings}` · `widgets/weekly-plan` · `pages/plan`
- BFF `npm test` 585 · `tsc` pass — 계약 글자 대조 · 게이트 fail-closed 7 · 입력 400 일곱(서버 0회) · 422 코드 · 경계 숫자 전달 · 계산 · 임계 상수 0(정적)
- 실 DB · 실 토큰(임시 계정 · BFF 브랜치 · 서버 main): 설정 전 → 422 `PLAN_BASE_AMOUNT_INVALID`(min · max · unit) · `PLAN_BAND_READ_ONLY` → 첫 저장 → 300,000원(정액 — 둘 다 관문 실패) · 김프 +2.94% 4,279원 → 지난 주 체크 422 `PLAN_WEEK_NOT_CURRENT` → 홈 "이번 주 적립 계획 300,000원"
- 실화면(설치 Chrome · 셸 3001): 1440 · 390 앱 웹뷰(가로 넘침 0) · axe 0(등장 애니메이션이 끝난 뒤 — 도중에 재면 투명도로 대비 위반이 잡힌다) · 로딩 `aria-busy` · 실패 + 다시 불러오기 · 게이트 닫힘(회색 상자 · "정상 동작입니다" · 밴드 표 0 · 금액 그대로) · 0배("신규 적립 계획 없음" · 매도 문구 0) · 김프 없음 · 월 합계 실패 격리 · 머리 메뉴 "적립" 선택
- 겹쳐 누름: 시험 도구의 0ms 연속 클릭에서만 완료 요청 2회(10 · 30ms 간격은 1회 — 사람의 더블 클릭에선 안 난다, 막기를 잠깐 빼고 간격별로 잼). ref 막기는 해가 없어 둔다 · 다른 폼(`mutate` 46곳)은 같은 결함이 아니라 고치지 않음
- 2회차("버그 검증 다함?"): 변이 9 — 8 잡힘 · "계획 실패를 빈 200 으로" 1 삶 → 시험 더해 잡힘 / main BFF(worktree 4012) 대조 10경로 — 차이는 홈 적립 줄 · 새 경로뿐(저축 · 가계부 검증 오류 순서는 main 도 매번 바뀜) / zone 다섯 운영 빌드 / 로그아웃 유리막(적립 호출 0) / 화면 §5 대조: 큰 숫자 아래 자산 목록이 카드 분해와 같은 숫자 → 뺌 · 비트코인 종목 아이콘(BFF 가 시세 목록 로고, 400ms · 실패면 글자)
- 정리: 임시 계정(앱 삭제 경로) · 초대 코드 · 셸 3001 — 남은 사람 행 0(적립 표 둘 포함)
- 미충족: 관측성 계측(게이트 차단 이벤트 · 카운터 — 보낼 곳 없음, 배포 환경 확정 시) · 앱(RN-REQ-016~019, 웹 계약 확정 뒤)

## 2026-11-19 FR 대조 정리(`WEB-perf-req-close-slice.md`)

| FR | 판정 | 근거 |
|---|---|---|
| FR-1 · 2 | 대체 · 충족 | `renderable` + `blockedReason`(머리 블록) — 늘 담긴다 |
| FR-3 | 충족 | 게이트 닫힘도 200 |
| FR-4 | 충족 | `kimchiPremium` 은 `| null` 타입 분리(`salt-microFe/packages/core/src/plan/plan.ts`) |
| FR-5 · 6 · 10 | 대체 | `staleDays` · Puell · `excluded` 없음 |
| FR-7~9 | 충족 | 1,000원 정수 · 배수 소수 · 문구 필드는 코드 |
| FR-11 · 12 | 충족 | `streak.skippedLast12` · complete 응답 `{ weekOf, streakWeeks, cumulativeKrw }` |
| FR-13 | 충족 | `pending.effectiveWeek`(`packages/core/src/plan/plan.ts:110`) |
| FR-14 | 충족 | CONTRACT 블록 글자 대조 `src/services/__tests__/plan-contract.test.ts` |
| FR-15 · 16 | 충족 | 본문 `{ monthlyBaseKrw }` · 422 그대로 · `editable: false` 리터럴 |
| FR-17 | 대체 · 충족 | 온보딩 없음 — 같은 `PATCH` 가 `configured: true` 를 준다 |
| FR-18 | 대체 | `status: 'unavailable'` 봉투 대신 상태 코드(머리 블록) |
| FR-19 | 충족 | v2 모양 `{ weekOf, executions: [{ asset, amountKrw? }] }` — `src/rest/controllers/plan.controller.ts` parseComplete · `matched*` 0 |

미충족 — 없음

# FE-REQ-023 checklists

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
| FR-1~5 | 충족 | 임계 리터럴 · 배수 곱 · 반올림 0(grep) — `entities/plan/lib/format.ts` 는 표시만 · 밴드 표는 서버 `bands` · 김프 레벨은 서버 |
| FR-6 | 대체 | lint 로는 못 막는다는 결정(`done-checklist.md` §2-2, 2026-11-04) — BFF 정적 시험(계산 · 임계 상수 0) + 이번 grep 0. 프론트 전용 시험은 없다 |
| FR-10 · 11 · 15 | 충족 | v2 모양 — 셀렉터 대신 BFF 가 fail-closed 로 닫은 `renderable` 하나만 읽는다(`entities/plan/ui/PlanAssetCard.tsx:42`) |
| FR-12 · 13 | 충족 | 트리에서 뺀다 · 금액 줄 유지(`PlanAssetCard.tsx:42`) |
| FR-14 | 대체 | 홈에 밴드 카드가 없다(투자 카드 한 줄) |
| FR-16 | 범위 이동 | `plan_multiplier_blocked` 이벤트 — `OPS-001` FR-9 |
| FR-20 · 60 | 대체 | 홈 ② · RSC 대신 클라이언트 잎(머리 블록) — 월 합계는 별도 쿼리 · 블록 격리 |
| FR-21 · 22 | 충족 | BFF 한 번 — `entities/plan/api/planApi.ts` |
| FR-23 | 대체 | 한 응답 — lazy fetch 없음(머리 블록) |
| FR-24 · 25 | 충족 · 대체 | `kimchiPremium: null` 정상 · 지표 배열 응답 없음 |
| FR-30 | 충족 | v2 모양 `POST /api/app/plan/weekly/complete` |
| FR-31 · 54 | 충족 | 체크 상태만 낙관적 + 실패 롤백 — `features/complete-weekly-plan/api/useCompleteWeeklyPlan.ts` |
| FR-32 | 대체 | `Idempotency-Key` 대신 서버 주 단위 멱등 + ref 막기(`features/complete-weekly-plan/ui/CompleteWeeklyPlanForm.tsx:38`) |
| FR-33 | 대체 | 2026-09-21 개정 |
| FR-34 · 35 | 충족 | plan 키 전부 무효화(`useCompleteWeeklyPlan.ts:36`) · 금액 고치기 칸 |
| FR-40~43 · 45 | 충족 | 한 칸 폼 · 형식만 검사 · 422 매핑(`PlanSettingsForm.tsx:30`) · 저장 뒤 서버 값으로 다시 받음 |
| FR-44 | 대체 | 온보딩 은퇴 |
| FR-61 · 62 | 충족 | 합계 계산 0 · 실패 격리(`widgets/weekly-plan/ui/WeeklyPlanBoard.tsx:98-101`) |
| FR-50~53 | 충족 | 주문 · 차익거래 · 매도 문구 · 점수 0 |

| 남은 것 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-16 게이트 차단 이벤트 | 배포 안 함 — 보낼 곳이 없다 | `OPS-001` FR-9 착수 시 |

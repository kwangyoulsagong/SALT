# FE-REQ-022 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: FR-62 온보딩 3단계는 지금 "첫 목표"(목표 추가, `d6342a1` 2026-09-30) — F003 착수 때 적립액으로 바꿀지 열린 질문

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
| FR-1 · 2 · 4 · 70 | 충족 | 큰 숫자 · 서버 정수 · `aria-label` — `entities/plan/ui/PlanTotal.tsx:21` |
| FR-3 | 충족 | v2 모양 — 홈은 투자 카드 한 줄, 상세는 `/plan` |
| FR-10 · 11 · 13 · 15 | 충족 | 회색 상자 · "정상 동작입니다" · 금액 줄 유지 — `entities/plan/ui/PlanAssetCard.tsx:42 · 57` · `entities/plan/model/messages.ts:95` |
| FR-12 · 33 · 73 | 대체 | 링크 · `<details>` 대신 성적 · 빗나간 때를 카드 안 두 칸 격자에 늘 보인다(`PlanAssetCard.tsx:72 · 111`, s3 판단 3) |
| FR-14 | 충족 | 홈 줄은 금액만 — 밴드 카드가 홈에 없다 |
| FR-20 | 충족 | 코드 + 수치 조립 |
| FR-21 | 대체 | LLM 0 |
| FR-22 · 23 · 72 | 충족 | `entities/plan/ui/BandTable.tsx:21-22`(`<table>` · `<caption>` · 지금 줄 강조) |
| FR-24 · 71 | 충족 | 지금 밴드는 면 + "지금" 글자 |
| FR-25 · 26 · 27 | 대체 | Puell · `staleDays` 없음 → `fallback` · `band_pending` 문구 |
| FR-30 · 32 · 34 | 충족 | v2 모양 — 과거 성적과 빗나간 때가 같은 무게(날짜 · 밴드 · 52주 결과) |
| FR-31 | 대체 | v1 시드 안 씀(머리 블록) |
| FR-40~44 | 충족 | `entities/plan/ui/PlanFacts.tsx:12`(원화 비용 · 레벨은 서버 · 없으면 칸만 숨김) · 차익거래 문구 0 |
| FR-45 | 충족 | 맥락 문장 `messages.ts:116` |
| FR-50 · 52~55 | 충족 | 체크 폼 · `StreakLine`(`PlanFacts.tsx:30`) · 평가 0 · 체크만 낙관적 |
| FR-51 | 대체 | 2026-09-21 개정 |
| FR-60 · 61 · 65 | 충족 | 월 적립액 한 칸 · 다음 주부터 안내 · 하한 · 상한 · 단위는 응답 `limits`(`features/edit-plan-settings/ui/PlanSettingsForm.tsx:30`) |
| FR-62 · 63 | 대체 | 온보딩 은퇴 · `excluded` 폐기(머리 블록) |
| FR-64 | 충족 | "이번 주 신규 적립 계획 없음"(`messages.ts:35`) · 매도 문구 0 |
| FR-74 | 충족 | 부호는 글자(`entities/plan/lib/format.ts:14-21`) |
| FR-75 | 충족 | `aria-busy` — `widgets/weekly-plan/ui/WeeklyPlanBoard.tsx:41` |
| FR-80~86 | 충족 | `PlanFacts.tsx:41-56`(서버 숫자 · "계획" 기준 · 계획 0 이면 막대 없음 · `ProgressBar`) · 설정 전 빈 상태 + 설정 칸(`WeeklyPlanBoard.tsx:64`) · 합계 실패 격리(`:98-101`) |

성능은 `FE-REQ-025` 정리(CLS 0.0006 · LCP 404~660ms · 라우트 전용 JS 11.5 kB).

미충족 — 없음

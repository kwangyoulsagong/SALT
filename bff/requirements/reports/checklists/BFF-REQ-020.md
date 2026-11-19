# BFF-REQ-020 checklists

## 2026-11-19 F003 v2 순서 3

- 구현 위치: BFF `services/plan.viewmodel.ts`(계약 · fail-closed) · `app-plan.service.ts` · `rest/{routes,controllers}/plan.*` · 홈 `app-home.service.ts` · `home-card.viewmodel.ts` · `utils/error.util.ts`(422 경계 옮김) — 프론트 `@repo/core/plan` · `entities/plan` · `features/{complete-weekly-plan,edit-plan-settings}` · `widgets/weekly-plan` · `pages/plan`
- BFF `npm test` 585 · `tsc` pass — 계약 글자 대조 · 게이트 fail-closed 7 · 입력 400 일곱(서버 0회) · 422 코드 · 경계 숫자 전달 · 계산 · 임계 상수 0(정적)
- 실 DB · 실 토큰(임시 계정 · BFF 브랜치 · 서버 main): 설정 전 → 422 `PLAN_BASE_AMOUNT_INVALID`(min · max · unit) · `PLAN_BAND_READ_ONLY` → 첫 저장 → 300,000원(정액 — 둘 다 관문 실패) · 김프 +2.94% 4,279원 → 지난 주 체크 422 `PLAN_WEEK_NOT_CURRENT` → 홈 "이번 주 적립 계획 300,000원"
- 실화면(설치 Chrome · 셸 3001): 1440 · 390 앱 웹뷰(가로 넘침 0) · axe 0(등장 애니메이션이 끝난 뒤 — 도중에 재면 투명도로 대비 위반이 잡힌다) · 로딩 `aria-busy` · 실패 + 다시 불러오기 · 게이트 닫힘(회색 상자 · "정상 동작입니다" · 밴드 표 0 · 금액 그대로) · 0배("신규 적립 계획 없음" · 매도 문구 0) · 김프 없음 · 월 합계 실패 격리 · 머리 메뉴 "적립" 선택
- 결함 1(고침): 더블 클릭에 완료 요청 2회 — `isPending` 은 다음 렌더에야 참. ref 로 막고 다시 재서 1회 · 설정 폼 같은 원인 같이
- 정리: 임시 계정(앱 삭제 경로) · 초대 코드 · 셸 3001 — 남은 사람 행 0(적립 표 둘 포함)
- 미충족: 관측성 계측(게이트 차단 이벤트 · 카운터 — 보낼 곳 없음, 배포 환경 확정 시) · 앱(RN-REQ-016~019, 웹 계약 확정 뒤)

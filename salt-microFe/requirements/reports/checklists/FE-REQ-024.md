# FE-REQ-024 — 검증 체크리스트

이 REQ 는 to-do 다. 아래는 다른 슬라이스가 파일만 걸친 기록이다.

## 2026-10-28 — F000 웹 API 에러 정규화 (파일만 걸침)

| 항목 | 결과 |
|---|---|
| `entities/market/model/types.ts` | `ChartPeriod` enum 추가(파일 머리 REQ). FR-50 타입 공유 범위 밖 그대로 |
| 검증 | check-types · lint · web · web-tax build · layer-check pass. 재시도 실측은 루트 `requirements/reports/checklists/F000-api-error-normalize.md` §2 |

미검증: 없음 — 판단 · 화면 무변경

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: FR-50 은 이 REQ 가 아니라 `FE-REQ-012` FR-50(뷰모델 타입 공유) — Changelog 의 "FR-50 범위 밖"은 그 뜻. 시세 · 관심

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
| FR-1 | 충족 | `packages/core/src/plan/plan.ts:10`(BFF 와 글자 대조) |
| FR-2 | 범위 이동 | zod 런타임 파싱 — `RN-REQ-018` FR-1(앱 착수 때 web 과 공유). 웹은 BFF fail-closed 가 모양을 지킨다 |
| FR-3 | 충족 | BFF 가 `renderable` 없으면 `false`(`bff/src/services/plan.viewmodel.ts:5`) |
| FR-4 · 5 · 7 | 충족 | `multiplier: 0` · `kimchiPremium: null` 정상 · 반올림 0 |
| FR-6 | 대체 | LLM 0 — `narrative` 없음 |
| FR-8 | 대체 | `Idempotency-Key` 대신 서버 주 단위 멱등 + ref 막기 |
| FR-9 | 충족 | 쿠키 — `packages/web-shared/src/api/apiFetch.ts:50`(`credentials: same-origin`) |
| FR-10 | 대체 · 충족 | RSC fetch 가 없다(클라이언트 잎) — BFF 응답이 `no-store`(`bff/src/rest/controllers/plan.controller.ts:41~75`) |
| FR-11 | 대체 | 실패 이력 경로가 없다 |
| FR-12~15 | 충족 | 패치 타입에 밴드 키 0 · `editable: false` 리터럴 · `configured: false` 정상 · `progressPct: null` 정상 · `matched*` 0 |
| FR-20~24 | 충족 | 서버 · 외부 직접 호출 0 · 키 · 주문 문자열 0 · 응답 통째 로깅 0(grep) |

| 남은 것 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-2 zod 런타임 파싱 | 데스크톱 먼저 — 웹은 BFF fail-closed | `RN-REQ-018` FR-1(RN 착수) |

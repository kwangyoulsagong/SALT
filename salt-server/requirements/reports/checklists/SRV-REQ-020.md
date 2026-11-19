# SRV-REQ-020 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: F004 3종 게이트가 `IndicatorTrackRecord` · `signalTypes` GIN 에 의존한다는 전제는 사실 아님 — F004 는 판단 · 추천

## 2026-11-19 F003 v2 순서 2

- 도메인 경계 표 51 · 유스케이스 7 — 주 경계(일 23:59 / 월 00:00 KST · 해 넘김) · 1,000원 반올림(0.5 올림) · 월 적립 검증 7행 · 배수 신뢰 경계 6행 · 빠진 주 채움 · 실행 상한 · 연속 · 월 합계 · 3종 게이트 6행 · 김프 경계 4행 · 읽기 전용 키
- 변이 4: 반올림 → 버림(잡힘) · 지난 planned 마감 제거(잡힘) · 관문 실패 정액 줄 제거(**처음엔 살았다** → 계약 위반 행 경계 추가 뒤 잡힘) · 요일 식 같은 뜻 교체(살아야 함 — 삶)
- 실 DB · 실 토큰(임시 계정, 브랜치 서버 4020): 설정 전 → 422 넷 · 400 둘 → 첫 저장 즉시 이번 주 행 → 실제 예측(둘 다 `not_better_than_flat`) 정액 150,000 + 150,000 · 김프 +2.94% → 4,279원 → 체크 · 고침 · 상한 · 지난 주 → 월 합계 40% · 12일 → 수정 다음 주 반영 → 시작 주 앞당겨 지난 주 마감(정액 · fallback)
- 미충족: FR-77 자산별 끄기(v2 범위 밖) · 실화면(순서 3)
- 2회차(같은 날): 동시 요청 실 DB — 첫 저장 8개 동시(값 다름) → 설정 1행 · 이번 주 2행 · 이전 값 · 반영 주 일관(잠금 줄 세움) / 빠진 7주 채움 GET 15개 동시 → 14행 정확(중복 0 · skipped 12 · planned 2) / 체크 6개 동시 + GET 섞음 → 마지막 값 하나 · 상태와 값 짝 유지. 전부 200 · 서버 로그 오류 0
- 2회차: 구현 전 기존 코드 찾기를 빠뜨렸다 — KST 변환 · 일수 차를 공용 `KstDate` 로 바꿈(주 · 달 계산은 plan 규칙이라 남김)

## 2026-11-19 FR 대조 정리(`WEB-perf-req-close-slice.md`)

| FR | 판정 | 근거 |
|---|---|---|
| FR-1~4 · 6 · 13 · 14 | 대체 | 밴드 · 관문 · 성적 · 실패 사례는 예측(`FC-REQ-029`) — 서버는 범위 0~3 · 관문 실패 1.0 만(`src/plan/domain/policy/weekPlan.ts:15`) |
| FR-5 | 충족 | `domain/policy/amount.ts:15 · 54` · 시험 `plan.test.ts:94-99` |
| FR-7 | 대체 | 코스피가 대상(글로벌 플랜) |
| FR-8 | 충족 | 0배는 `amountKrw: 0` + `reasonCode` 넷 — 매도 코드 0 |
| FR-10~12 | 충족 | `bandCardGate` — `domain/policy/bandCard.ts:12` · 시험 `plan.test.ts:234-244` |
| FR-20~23 | 충족 | v2 모양(그 주 예측 행 없음 → 1.0 + `fallback` · 스냅샷) — `weekPlan.ts:15 · 24` · 시험 `plan.test.ts:134-145` |
| FR-30 · 31 | 충족 | `domain/policy/weekBoundary.ts:29` · 시험 `plan.test.ts:77-86` |
| FR-32 | 충족 | 읽을 때 멱등 채움 `application/lib/syncWeeks.ts:24` · `ON CONFLICT DO NOTHING`(`infrastructure/PrismaExecutionStore.ts:56`) · 동시 15요청 중복 0(체크리스트 2회차) |
| FR-33 | 충족 | 주 단위 고정 |
| FR-40~45 | 충족 | `domain/policy/execution.ts:10 · 31` · 시험 `plan.test.ts:174-195` |
| FR-46 | 대체 | 2026-09-21 삭제 |
| FR-50 | 대체 | 김프 값은 예측 배치 |
| FR-51~54 | 충족 | 원화 비용 · 레벨 · 실패 시 `null` — `bandCard.ts:34-49` · 시험 `plan.test.ts:247-260` · 차익거래 문구 0 |
| FR-55 · 56 | 대체 | 서버가 김프를 계산하지 않는다 — 캐시 · 디페그 대상이 없다(머리 블록) |
| FR-60~62 | 대체 | LLM 0 — 코드 + 수치(머리 블록) |
| FR-63 · 64 | 충족 | `reasonCode` 넷 · 확신 표현 0 |
| FR-70~76 | 충족 | 월 적립액 하나 · 환산(`amount.ts:35`) · 422(`amount.ts:19`) · 읽기 전용 키(`domain/policy/readOnlyKeys.ts:7`) · 다음 주부터(`amount.ts:39`) · 첫 저장 즉시(`application/UpdatePlanSettings.ts:43`) · 한 유스케이스 |
| FR-77 | 대체 | 배분 읽기 전용(v2) — 자산별 끄기가 없다. 글로벌 플랜 범위 밖 "배분 편집 · 사용 뒤" |
| FR-80~83 | 충족 | `domain/policy/monthlySummary.ts:23` · 시험 `plan.test.ts:204-226` |

실화면(순서 3)은 `FE-REQ-022` 체크리스트에서 닫혔다.

미충족 — 없음

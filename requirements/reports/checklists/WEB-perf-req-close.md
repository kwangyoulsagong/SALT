# 데스크톱 기능 닫기 — 성능 · 마이그레이션 REQ 정리 체크리스트

슬라이스 `requirements/specs/done/WEB-perf-req-close-slice.md` · 브랜치 `feat/web-perf-close` · 2026-11-19.
측정은 임시 계정(초대 코드 → 가입 · 거래 3건 · 월 적립 130만) · 워커 없는 임시 서버 4020(쿼리 로그) · 임시 BFF 4011 · 투자 zone 운영 빌드(복사본 앱) · 설치 Chrome 헤드리스.
측정 뒤 계정은 앱 삭제 경로로 지웠고 초대 코드 · 임시 프로세스 · 복사본을 치웠다(사람 표 행 0 확인).

## 요구사항 ↔ 구현

| 요구사항 | 구현 | 확인 | 결과 |
|---|---|---|---|
| 추천 · 점수 재료 조회는 피드백 행을 돌려주지 않는다(`DB-REQ-020` FR-1 이 막으려던 경우 — 결함) | `coach/domain/ports.ts` `FEEDBACK_KEY_PREFIX` · `PrismaCoachInsightStore` `EXCLUDE_FEEDBACK`(최신 · 이력 · 점수 재료) · 접두사 없는 키 거절 · `RecordCoachFeedback` | 시험 3(`feedbackRowsExcluded` · `recordCoachFeedbackKey`) · 변이(최신 조회에서 빼면 실패, scratchpad 사본으로 되돌림) · 실 DB(추천 1 + 피드백 1 → 최신 · 이력 = `main_coach`, 접두사 없는 키 거절, 2행 지움) | pass |
| 코치 생성 기록 보존 90일(`SRV-REQ-027` FR-24 · `DB-REQ-020` FR-41 · 42) | `GenerateCoachRecommendation` `COACH_GENERATION_LOG_KEEP_DAYS` · `PrismaCoachGenerationLogStore.pruneBefore` | 시험 2(성공 · 실패 모두 기한 앞 지움 · 지우기 실패해도 생성 끝남) · 실 DB(100일 전 1건만 지움) | pass |
| 코치 상세 두 호출 병렬(`SRV-REQ-027` FR-30) | `GetCoachDetail` `Promise.all` | 코치 테스트 1114 통과 · 상세 쿼리 11 · 서버 p95 5.0ms | pass |
| plan 응답 `no-store`(`BFF-REQ-022` FR-34 · `FE-REQ-025` FR-34) | `bff/src/rest/controllers/plan.controller.ts` | 시험(다섯 경로 성공 응답 헤더) · BFF 588 통과 | pass |
| 거래 시트 지연 로딩(`FE-REQ-033` FR-74) | `widgets/position-overview/ui/PositionOverview.tsx` | 운영 빌드 두 판 실로그인 — 첫 진입 309.9 → 301.3 kB · 시트 17.7 kB 누를 때 · 열림 · Esc 닫힘 · 오류 0 | pass |
| 피드백 결함 — 경로 단위 main · 브랜치 대조(2회차) | 위와 같음 | 같은 임시 사용자 · 추천 생성 → 피드백 1건 → main(4000): 상세 추천 `null` · 최신 = 피드백 행 · 브리핑 카드 `null` · 대화 카드 0 / 브랜치(4020): 넷 다 남음 | pass |
| 거래 시트 390 앱 웹뷰(2회차) | 같음 | 바텀시트 폭 390 · 높이 709 · 가로 넘침 0 · 닫기 · 다시 열기 | pass |
| 나중에 받는 잎 청크 실패 — 화면을 지우지 않는다(2회차에 찾은 결함) | `@repo/web-shared/lib` `useLazyComponent` · 시트 · 뉴스 창 | 청크 요청 차단: 첫 판은 포트폴리오 전체가 섹션 오류(fail) → 고친 뒤 Hero 남음 · 섹션 오류 0 · 한 줄 · 다시 누르면 열림 / 뉴스 창 보드 남음 · 한 줄 · 정상 열기 · 닫기 · 주소로 다시 열기 | pass |
| 대화 말풍선 리렌더(`FE-REQ-033` FR-10 · 12) | 바꾸지 않음(memo 넣었다 뺌 — `performance-frontend.md` §0) | memo 없이 칩 질문 → 답 2말풍선 동안 긴 프레임 0 | pass(대체) |
| 격자 구분선 끌기(`FE-REQ-033` FR-20) | 바꾸지 않음 | 138프레임 p50 · p95 · 최대 16.7 · 16.7 · 16.8ms · 긴 프레임 0(2회) | pass(측정 충족) |
| `/plan` CLS · LCP · 라우트 JS(`FE-REQ-025` FR-7 · 예산) | 바꾸지 않음 | CLS 0.0006(3회) · LCP 404~660ms · 라우트 전용 11.5 kB | pass |
| 서버 · BFF 지연 · 쿼리 수(F003 · F004 · F006 성능 REQ 측정 FR) | — | 슬라이스 실측 표 — 전 경로 예산의 수 % · 포지션 쿼리 4(≤ 8) · 상세 11(≤ 15) | pass |
| `EXPLAIN (ANALYZE, BUFFERS)`(`DB-REQ-024` FR-32 · `DB-REQ-016`) | — | 표 다섯 — 유니크 인덱스 둘 · 작은 표 셋은 `enable_seqscan = off` 로 인덱스 확인 | pass |
| 오지 않은 달 400(`SRV-REQ-021` FR-29 — 대조에서 찾은 빠진 구현) | `plan/application/GetMonthlySummary.ts` `PlanMonthInFutureError` · Swagger 400 사유 | 시험(이번 · 지난 달 200 · 다음 달 · 내년 400 · KST 월말 경계) · 변이(거절 줄 빼면 실패) · Swagger 시험 | pass |
| 종목 판단 · 판정 성적 · 성적표 실측(`SRV-REQ-027` FR-4 · 6 · 70 · 73, 2회차) | 쿼리 상한은 정정(슬라이스 판단 9) | 종목 판단 p95 4.2ms · 쿼리 16/20 · 판정 성적 p95 1.8ms · 쿼리 6 · 성적표 p95 26.8ms | pass(정정 포함) |
| 넘긴 FR 받는 쪽 기록 | `OPS-001` FR-9 · `RN-REQ-018` FR-1 | 문서 | pass |
| 영역 REQ 문서 FR 대조 · 이동 | 각 REQ 스펙 `## 정리 2026-11-19` · 체크리스트 · 회고 | 영역 체크리스트에 FR 마다 | 영역 체크리스트 참조 |

## 검증 명령

| 명령 | 결과 |
|---|---|
| 서버 `npm run build` · `lint` · `npm test` · `test:layer-check` | 0 오류 · 2003 통과 · 차단 10 · 통과 6 |
| BFF `npm run build` · `npm test` | 0 오류 · 588 통과 |
| 웹 `pnpm check-types` · `lint` · `test` · `test:layer-check` | 13 · 13 작업 성공 · core 309 · ui 76 · web 10 · 차단 16 · 통과 10 |
| 투자 zone 운영 빌드(복사본 앱) | 성공 — `/plan` 149 kB · `/portfolio` 150 kB · `/coach/chat` 168 kB(First Load) |
| `node scripts/check-done.mjs` | done 전 마지막에 |

## 미충족 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 관측 카운터 · RUM · 대시보드 | 배포 안 함 — 보낼 곳이 없다 | `OPS-001` 착수 시 |
| `/coach/chat` LCP 496~524ms > 첫 페인트 예산 400ms | 예산 지표(최신 insight 읽기)와 LCP(격자 셋 다 그린 뒤)가 다르다 · 경로 지연은 수 ms | `FE-REQ-047` 틀 재설계 때 다시 잰다 |
| F006 LLM 경로 FR | 대화는 규칙 답 — A/B 먼저 | LLM 대화를 켜는 결정 때 |
| 실수 — 첫 zone 빌드를 dev 서버와 같은 폴더에서 돌려 투자 zone dev(3002)가 500 | 메모(`apps/<복사본>` 에서 빌드)를 안 따랐다 | 그 자리에서 `.next` 지우고 재기동 → 200. 이후 빌드는 복사본에서 |

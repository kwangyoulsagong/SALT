---
id: SLICE-WEB-PERF-REQ-CLOSE
title: "데스크톱 기능 닫기 — 성능 · 마이그레이션 REQ 정리(F003 · F004 · F006 · F000) · 실측 · 남은 결함 셋"
priority: medium
labels: [F003, F004, F006, F000, perf, server, bff, fe, slice]
created: 2026-11-19
status: done
---

## Summary

사용자 "데스크톱부터 다 만들고 앱하는게 맞을듯" → "1번 하고 새브랜치 파고 ㄱㄱ · 파이프라인으로 진행". 1번 = 웹 기능 쪽 남은 것 — 성능 REQ 묶음 + F003 · F006 REQ 정리.
브랜치 `feat/web-perf-close`. 디자인(마스터 인덱스 §4-1 순위 5) 전에 웹 기능 칸을 닫는다.

한 줄 — **9월에 쓴 성능 · 마이그레이션 REQ 18개를 FR 마다 코드로 대조해(충족 / 나중 결정으로 대체 / 남은 일) 가르고, 남은 일은 고치거나 실측으로 닫았다. 대조 중 결함 하나(피드백 한 건 뒤 저장 추천 카드가 사라짐)를 찾아 고쳤다.**

## 범위

| 묶음 | REQ | 이번 몫 |
|---|---|---|
| F003 성능 · 마이그레이션 | `FE-REQ-025` · `BFF-REQ-022` · `SRV-REQ-023` · `DB-REQ-016` · `DB-REQ-015` | v1 설계(김프 별도 경로 · 지표 워커 · 시드 · GIN) FR 대체 표기 · 실측 · plan 응답 `no-store` |
| F003 진행 중 | `SRV-REQ-020`~`022` · `DB-REQ-013` · `014` · `BFF-REQ-019`~`021` · `FE-REQ-022`~`024` | 남은 FR 확인 · 닫힌 것 done |
| F004 성능 · 마이그레이션 | `SRV-REQ-027` · `DB-REQ-020` · `DB-REQ-019` | 스냅샷 원장으로 대체된 FR 표기 · 생성 기록 보존 · 상세 병렬 · 피드백 결함 · 실측 |
| F006 성능 · 데이터 · 마이그레이션 | `FE-REQ-033` · `BFF-REQ-029` · `030` · `SRV-REQ-030` · `031` · `DB-REQ-023` · `024` | LLM 0 · 홈 대체 · 알림 Kotlin 표기 · 거래 시트 지연 로딩 · 실측 |
| F000 | `DB-REQ-002` · `DB-REQ-004` · `SRV-REQ-011` | 흡수 · 소멸 표기 |
| 파일만 걸침 | `SRV-REQ-007`(인사이트 저장소 머리) · `SRV-REQ-048`(코치 포트 머리) · `DB-REQ-017` · `SRV-REQ-025` | Changelog 한 줄 |

## 판단 — 리뷰가 볼 곳

1. **피드백 행이 최신 추천을 가렸다(결함)** — 피드백도 `investment_insights` 의 같은 `ai_coach` 타입에 쌓이는데 `findLatestRecommendation` 은 "가장 최근
   `ai_coach`" 를 골랐다. 피드백 한 건 뒤로 상세 · 리포트 · 대화의 저장 추천 카드가 계속 `null`, 이력 · 점수 재료에도 섞였다. 웹은 피드백을 부르지 않지만
   BFF 경로가 살아 있어 앱이 붙는 순간 터진다. **규칙: 추천 · 점수 재료를 읽는 조회는 피드백 행을 돌려주지 않는다** — 키 접두사(`FEEDBACK_KEY_PREFIX`,
   도메인 한 곳)로 가른다. `InsightType` 은 enum 이라 타입을 늘리면 `ALTER TYPE` 마이그레이션이 필요해 키(유니크 인덱스 열)를 썼다. 접두사 없는 피드백 키는
   저장소가 거절한다. 여러 행 조회 셋(최신 · 이력 · 점수 재료) 전부에 걸었는지 소스 검사로 센다
2. **코치 생성 기록 보존 90일은 cron 이 아니라 생성마다** — 기록은 생성 때만 늘어나므로(사용자 ≤10 · 수동 5분 쿨다운) 생성이 끝날 때 오래된 것을 지운다
   (`MeasurePanelCells` 와 같은 꼴). 지우기 실패는 생성을 막지 않는다(동기 예외까지 삼킨다)
3. **대화 취소 버튼은 만들지 않는다(대체)** — 서버가 규칙 답을 계산한 뒤 문장 · 카드 · 끝을 한 번에 이어 써서 스트림이 밀리초 안에 끝난다(실측 질문 → 끝 p95 38ms).
   누를 틈이 없다. 연결 종료 전파(BFF close → abort · 서버 `release`)는 이미 있다. LLM 경로가 켜질 때 그 FR 들과 같이 다시 본다
4. **대화 말풍선 `memo` 는 넣었다가 뺐다** — `performance-frontend.md` §0(측정 없이 memo 금지). 델타는 토큰이 아니라 문장(2~6개)이고 한 번에 온다.
   memo 없이 답을 받는 동안 긴 프레임 0(운영 빌드 실측)
5. **격자 구분선은 `left/top` 그대로** — 끄는 동안 138프레임 전부 16.7ms · 긴 프레임 0. transform 으로 바꿀 이유가 없어 FR 을 측정 충족으로 정정
6. **거래 시트는 누를 때 받는다** — 로그인 `/portfolio` 첫 진입 JS 309.9 → 301.3 kB(전송 기준), 시트 17.7 kB 는 버튼을 누를 때. 한 번 연 뒤로는 붙여 둬
   닫힘 움직임이 끝까지 돈다. 로그아웃 상태 측정(230.9 → 231 kB)은 위젯을 안 불러 차이가 안 보였다 — 그래서 실로그인으로 다시 쟀다
7. **관측 카운터(게이트 미렌더 · RUM · 대시보드)는 범위 밖** — 배포하지 않는 프로젝트라 보낼 곳이 없다. `OPS-001`(배포) 착수 때 닫는다
8. **plan 응답 `no-store` 는 plan 다섯 경로만** — BFF 에 개인 응답 캐시 헤더 규칙은 없고 Express JSON 은 `Last-Modified` 가 없어 브라우저 휴리스틱 캐시가 안 걸린다.
   REQ 가 요구한 곳만 고쳤다
9. **종목 판단 쿼리 상한 10 · 판정 성적 목표 3 은 실측으로 정정** — 종목 판단은 쿼리 16(코인) · 20(국내)인데 p95 4.2ms(예산 150ms 의 3%), 판정 성적은 6개 · p95 1.8ms.
   9월 상한은 v2 이전(`ADR-010` 3종 채우기 전) 설계 기준이었고, 늘어난 넷은 모드마다 맞은 · 빗나간 사례 읽기(3종 로더)다. 한 문장으로 합치려면 동결된
   판단 엔진의 3종 로더를 고쳐야 하는데 얻는 지연이 없다. 같은 이유로 관찰 구간 캐시(Should)도 만들지 않는다(F004 문서 대조 에이전트가 수치 없이 닫지 말자고 해 2회차로 쟀다)

10. **`SRV-REQ-021` FR-29 "미래 달이면 400" 이 빠져 있었다** — DTO 는 `YYYY-MM` 형식만 봐서 다음 달을 물으면 200(계획 0)이었다. "오늘"이 필요한 판정이라
    DTO 가 아니라 시계를 가진 유스케이스에서 KST 오늘 달과 비교한다(월말 15:00Z 경계 시험). 웹은 `month` 없이 불러 영향 0
11. **넘긴 FR 은 받는 쪽에도 적었다** — 관측 항목 → `OPS-001` FR-9, 웹 zod 런타임 파싱(`FE-REQ-024` FR-2) → `RN-REQ-018` FR-1

## 실측 (2026-11-19, 브랜치 코드 · 임시 계정 · 측정 뒤 계정 · 초대 코드 지움)

방법: 워커 없는 임시 서버 4020(`PRISMA_LOG_QUERIES=1` — 요청 하나당 쿼리 줄을 셈) · 임시 BFF 4011 → 4020. 경로마다 예열 2회 뒤 10~20회 순차.
데이터: 거래 3건(BTC · ETH · 005930, 일주일 전 종가) · 월 적립 130만 · 코치 질문 12회. 웹은 투자 zone 운영 빌드(복사본 앱 — dev 서버와 `.next` 를 나누려고)를
설치 Chrome 헤드리스 1440×900 으로, `/api/app/*` 는 임시 BFF 로 넘김.

| 경로 | 쿼리 | 서버 p50 / p95 | BFF p50 / p95 | 예산 |
|---|---|---|---|---|
| plan weekly | 5 | 1.3 / 2.9ms | 10.5 / 12.8ms(로고용 시세 목록 포함) | 서버 250ms · BFF 얹는 지연 20ms |
| plan monthly-summary | 2 | 0.8 / 1.0 | 1.1 / 1.3 | 100ms |
| plan settings GET · PATCH | 2 · 6 | 0.6 / 0.7 · 3.6 / 7.1 | 0.9 / 1.0 · 2.3 / 3.8 | PATCH 150ms |
| plan weekly/complete | 3 | 3.8 / 5.0 | 3.5 / 5.2 | 100ms |
| portfolio position | 4 | 5.3 / 9.6 | 6.5 / 9.5 | 쿼리 ≤ 8 |
| position flow 1m · 1y | 2 · 3 | 4.3 / 5.8 · 7.7 / 11.4 | 4.2 / 5.3 · 6.2 / 6.7 | — |
| 거래 미리보기 | — | — | 1.9 / 4.2 | — |
| 거래 목록 | 2 | 1.5 / 2.5 | 12.0 / 21.3 | 300ms |
| coach detail | 11 | 3.2 / 5.0 | 4.5 / 9.1 | 400ms · 쿼리 ≤ 15 |
| generation-status | 2 | 0.6 / 1.0 | 0.9 / 1.6 | — |
| 종목 판단 `ai-coach?symbol=` BTC · 장기 · 005930(2회차 측정) | 16 · 16 · 20(예열 뒤) | 3.0 / 4.2 · 2.1 / 2.7 · 3.4 / 4.1 | — | 150ms · 쿼리 ≤ 10 → 정정(판단 9) |
| 최신 조회 `ai-coach` · 판정 성적 `signal-performance` | 1 · 6 | 0.6 / 0.8 · 0.8 / 1.8 | — | 50ms · 목표 쿼리 3 → 정정(판단 9) |
| 성적표 `coach/scoreboard` | 6 | 23.5 / 26.8 | 25.1 / 27.5 | 300ms |
| 알림 안 읽은 수(Kotlin) | — | — | 2.0 / 2.7 | — |
| panel-layout · conversations · briefing | 1 · 1 · 13 | 1.9 / 2.5 · 1.4 / 2.4 · 7.1 / 11.5 | 2.1 / 2.9 · 1.4 / 2.6 · 5.6 / 7.2 | — |
| 코치 대화 질문 → 첫 문장 | 15~26(질문 + 답) | — | 24.4 / 38.0ms | 첫 토큰 1s |

| 웹(운영 빌드) | LCP | CLS | 첫 진입 JS(전송) | 예산 |
|---|---|---|---|---|
| `/plan` | 404~660ms | 0.0006 | 241 kB · 라우트 전용 11.5 kB | LCP 1.5s · 라우트 JS 45 kB |
| `/portfolio` | 84~488ms | 0.0006~0.04 | 301.3 kB(전 309.9) | — |
| `/coach/chat` 1440 격자 | 496~524ms | 0.0006 | 265.2 kB | 첫 페인트 400ms(LCP 기준 넘음 — 아래) |

`EXPLAIN (ANALYZE, BUFFERS)` — `plan_settings` · `panel_layouts` 는 유니크 인덱스 Index Scan(0.05~0.06ms). `weekly_plan_executions` · `coach_conversations` ·
`coach_messages` 는 행이 1~3페이지라 Seq Scan(0.08~0.15ms), `enable_seqscan = off` 로 각각 `(user_id, week_of)` · `(user_id, last_message_at)` ·
`(conversation_id, created_at)` 인덱스를 타는 것 확인(0.06~0.12ms).

## 코드

| 영역 | 파일 | 무엇 |
|---|---|---|
| 서버 | `coach/domain/ports.ts` · `infrastructure/PrismaCoachInsightStore.ts` · `application/RecordCoachFeedback.ts` | 피드백 키 접두사 · 세 조회에서 피드백 뺌 · 접두사 없는 키 거절 |
| 서버 | `coach/application/GenerateCoachRecommendation.ts` · `infrastructure/PrismaCoachGenerationLogStore.ts` | 생성 기록 90일 보존(생성마다) |
| 서버 | `coach/application/GetCoachDetail.ts` | 변동성 · 추천 카드 두 await 병렬 |
| 서버 | `plan/application/GetMonthlySummary.ts` · `plan/domain/errors.ts` · `plan.routes.ts` | 오지 않은 달 400 `PLAN_MONTH_IN_FUTURE`(`SRV-REQ-021` FR-29 — 대조에서 찾은 빠진 구현) |
| BFF | `rest/controllers/plan.controller.ts` | plan 다섯 경로 `no-store` |
| 웹 | `widgets/position-overview/ui/PositionOverview.tsx` | 거래 시트 지연 로딩 |

## 검증

- 서버 `npm run build` · `lint` · `npm test` 2003 통과 · `test:layer-check` · 실 DB(임시 사용자로 피드백 · 보존 확인 뒤 지움)
- 변이: 최신 추천 조회에서 `EXCLUDE_FEEDBACK` 를 빼면 소스 검사가 실패(scratchpad 사본으로 되돌림)
- BFF `npm run build` · `npm test` 588 통과(plan 다섯 경로 `no-store` 시험 포함)
- 웹 `pnpm check-types` · `lint` · `test`(core 309 · ui 76 · web 10) · `test:layer-check` · 투자 zone 운영 빌드
- 실화면: `/plan` · `/coach/chat` 실데이터 스크린샷 · `/portfolio` 시트 열고 Esc 닫힘

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 관측 카운터 · RUM · 대시보드(게이트 미렌더 · 블록 `unavailable` 발생률 · 동시 스트림 수) | 배포 안 함 — 보낼 곳이 없다 | `OPS-001` 착수 시 |
| `/coach/chat` LCP 가 첫 페인트 예산 400ms 보다 큼(496~524ms) | 예산은 "코치 대화 첫 페인트"(최신 insight 읽기) — LCP 는 격자 · 대화 · 칸 둘이 다 그려진 뒤라 같은 지표가 아니다. 경로별 지연은 위 표대로 수 ms | `FE-REQ-047` 틀 재설계 때 같은 방법으로 다시 잰다 |
| F006 진행 중 REQ 의 LLM 경로 FR(부분 저장 · 토큰 수 · 답변 가드) | 대화는 규칙 답(LLM 0) — A/B 를 먼저 거쳐야 켠다 | LLM 대화를 켜는 결정이 날 때 |
| 앱 몫 FR(RN · 푸시 · 하단 탭) | 데스크톱 먼저(사용자 2026-11-19) | 마스터 인덱스 §4-1 순위 6 |

## Changelog

| 날짜 | 내용 |
|---|---|
| 2026-11-19 | 신규 — 성능 REQ 18개 FR 대조 · 피드백 결함 · 보존 · 상세 병렬 · plan `no-store` · 거래 시트 지연 로딩 · 실측 |
| 2026-11-19 | 2회차 실측(종목 판단 · 판정 성적 · 성적표) · 쿼리 상한 정정 · `SRV-REQ-021` FR-29 고침 · 넘긴 FR 받는 쪽 기록. 영역 REQ — done 30 · 진행 중 남김 13(F006 LLM 경로 · 앱 · F004 파일만 걸침) → done |

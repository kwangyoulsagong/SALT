---
id: FE-REQ-056
feature: F012
area: frontend
kind: UI
title: "F3 — 저축 zone(apps/web-savings + domain-savings): 목표 · 계산기 · 도달 구간 · 저울 · 모이는 장면"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-012-savings-goals.md
---

## Summary

지금 `entities/goal` · `features/add-goal` 을 `packages/domain-savings` 로 옮기고 목표를 계산기 화면으로 만든다. 바탕은 **모으는 재미** — 장면과 숫자가 말하고 앱은 칭찬하지 않는다.

## FR

| FR | 내용 | FEATURE-012 |
|---|---|---|
| FR-1 | 이전 — `entities/goal` · `features/add-goal` → `domain-savings`. 라우트 `/goals` · `/goals/[id]` · `/goals/new` 는 `apps/web-savings` | — |
| FR-2 | 만들기 — 템플릿 7종 · 기준선(출처 · 연도 · `verified:false` 면 "미확인") · 금액 수정 · 첫 도장 미리보기 | FR-1 · 17 |
| FR-3 | 계산기 — 금액+기한 ↔ 금액+월 적립 토글. 결과는 서버 응답, 입력 중 디바운스 요청 | FR-2 |
| FR-4 | 적립 — 단건 · 나눠 넣기. 저장 후 장면 한 칸 이동 모션 | FR-3 · 15 |
| FR-5 | 도달 구간 팬 차트 + 적중 이력(또는 "기록 부족" 이유). 한 점 날짜 표시 금지(`plan_only` 는 "계획대로면 X월" 문장) | FR-4 · 5 |
| FR-6 | 저울 — 목표별 월 적립 ~~슬라이더~~ **입력칸(정정 2026-11-03 — 목표마다 금액 단위가 달라 범위를 못 정한다)** → 구간 변화, [확정]만 저장 | FR-6 |
| FR-7 | 이정표 · 프레임 전환 · 오늘 돈 · 놓친 달 회고 · 비상시 비교 카드 | FR-7~11 |
| FR-8 | 모이는 장면 — 템플릿별 그림(여행 비행기 · 차 조립 · 우산). `FE-REQ-044` 모션 장면 재사용. reduced-motion 이면 정지, 진척은 텍스트로도 | FR-15 |
| FR-9 | 실물 환산 한 줄 · 사용자 단위 만들기 | FR-16 |
| FR-10 | 도장판 · 엽서 보관함(달성 목표) | FR-17 · 18 |
| FR-11 | 공동 목표 — 비율 차이 · 이모지 반응 | FR-13 · 19 |
| FR-12 | 때맞춘 팁 카드 자리(`@repo/ui` 공용 카드, `for-me?context=savings`) | F014 FR-4 |
| FR-13 | 첫 숫자 서버 렌더(RSC) — 스켈레톤 없이 진척 · 이정표 | NFR |

## 진행 — F3a (2026-11-03, 슬라이스 `requirements/specs/done/MONEY-S1a-savings-calculator-slice.md`)

| FR | 상태 |
|---|---|
| FR-1 | done — `packages/domain-savings`(`entities/goal` · `features/add-goal` · `record-deposit` · `pages/goals` · `add-goal` · `goal-detail`) · `apps/web-savings` `/goals` · `/goals/new` · `/goals/[id]`(옛 `/goals/addgoals` 는 새 만들기로 리다이렉트) · 레지스트리 `savings.hostedIn = web-savings` · `APP_TABS` 저축 `readyBy: null`. 셸 목표 코드 삭제 |
| FR-2 | 부분 — 템플릿 7 · 금액 입력 · 기준선 "원문 확인 전이라 비워 둠"(금액 없음). ~~첫 도장 미리보기는 도장(S1b) 뒤~~ **첫 도장 미리보기 done 2026-11-03 `88ede7aa`** |
| FR-3 | done — 기한 ↔ 월 적립 토글 · 300ms 디바운스 · 결과는 서버 응답 · 세후 이자 가정 문장 |
| FR-4 | 부분 — 단건 · 나눠 넣기(합계는 서버가 검증, 화면은 더하지 않음). ~~장면 한 칸 모션은 S1b~~ **S1b 2026-11-03 done(F3b 표)** |
| FR-5 | 부분 — 구간 문장(A ~ B · 열림 · "계획대로면") + 이유 + 채점 대기 문장. ~~**팬 차트는 S1b**~~ **정정 2026-11-03: 팬 차트는 채점 사본과 같이**(구간이 쌓이는 3개월 뒤라야 그림이 뜻을 갖는다 · 월별 분위 경로가 응답에 없다) |
| FR-7 | 부분 — 이정표 · 프레임. ~~오늘 돈 · 놓친 달 · 비상시는 S1b~~ **S1b 2026-11-03: 놓친 달 · 비상시 done, 오늘 돈은 범위 밖(물가 원천)** |
| FR-13 | ~~**미충족** — 토큰이 브라우저 저장소라 서버가 볼 수 없다~~ **done 2026-11-03** `0ef25f6b` — 쿠키 세션 1단계로 서버 렌더 |
| FR-6 · 8~12 | S1b — 저울 · 장면 · 실물 · 도장 · 엽서 · 공동 · 팁 카드 — **2026-11-03 S1b 가 FR-6 · 8 · 9 · 10 을 가져감(아래 표)** |

## 진행 — F3b (2026-11-03, 슬라이스 `requirements/specs/done/MONEY-S1b-savings-fun-slice.md`)

| FR | 상태 |
|---|---|
| FR-2 | 첫 도장 미리보기 done(`88ede7aa`). 남은 것 기준선 금액(출처 대조) |
| FR-4 | done — 적립 뒤 장면 한 칸 이동(응답 `scene.step` · `ProgressScene`). 측정: 기본 설정 적립 뒤 10프레임에 걸쳐 이동 · 줄인 모션은 중간 프레임 0(이전 칸 → 새 칸) |
| FR-5 | 부분(그대로) — 팬 차트는 채점 사본과 같이(월별 분위 경로가 응답에 없다) |
| FR-6 | done — `features/rebalance-goals` `BalanceScale`: 진행 중 목표마다 월 적립 입력 → 300ms 디바운스 → 서버 `simulate` → 지금 / 바꾸면 / 이동 달 · 합계 전후 · 기한보다 늦어지면 사실 한 줄 → [확정]만 저장(`PUT goals/plans`). ~~슬라이더~~ **정정 2026-11-03**: 숫자 입력칸 — 금액 단위가 목표마다 달라(10만 ~ 수백만) 슬라이더 범위를 정할 수 없다 |
| FR-7 | 부분 — 놓친 달(`MissedMonthsBox`) · 비상시(`features/compare-emergency` — 두 줄 같은 무게 · 사유 문구 · 가정 문장). **오늘 돈은 범위 밖**(물가 원천 없음) |
| FR-8 | done — `GoalScene`(`@repo/ui` `ProgressScene`, `FE-REQ-044` P-24) 목록 sm · 상세 md · "10칸 중 N칸" 글 · 줄인 모션 정지 |
| FR-9 | done — 목록 한 줄 환산 · 상세 `features/add-item-unit` 만들기 · 지우기(상한은 서버 `unitLimit`) |
| FR-10 | done — 상세 도장판(`StampBoard`, 30개까지 그림 · 개수 글) · 목록 아래 엽서 보관함(`PostcardList` — 걸린 일수 · 적립 횟수, 사진 없음) |
| FR-11 · 12 | 범위 밖 — 공동(S3) · 팁 카드(F014) |

## Acceptance Criteria

- [x] `domain-savings` 에 금액 · 날짜 계산 0(리뷰 · grep: 산술 유틸 import 0) — 표시 변환 셋(막대 ÷100 · 부호 `Math.abs`)을 대조에서 찾아 `b1c8ad67` 로 없앰. grep `/ 100 · * 100 · Math. · reduce(` 0
- [x] 칭찬 · 재촉 · 명령형 문구 0(금지어 검사) — grep 0
- [x] reduced-motion 모션 0 · 스크린리더로 진척 읽힘 — ~~이번 판은 모션 없음~~ **S1b 2026-11-03**: 장면 이동은 줄인 모션에서 중간 프레임 0(실측) · 그래픽 `aria-hidden` + "10칸 중 N칸" 글 · 막대 라벨 `{제목} {퍼센트}%`
- [x] 기존 목표 화면 기능 회귀 0 — 목록(셸 홈 임시 → `/goals`) · 만들기(`/goals/new`) · 요약(홈 카드). 옛 만들기의 계좌 칸(목, 저장 안 됨)은 뺐다 — 수동 입력 · 연동 문구 금지 정책

## 계약 영향

- BFF `BFF-REQ-047`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | `FE-REQ-052` done — `apps/web-savings` 빈 골격 · 레지스트리 `savings`(`/goals`). 저축 화면(`/goals/addgoals`)을 옮기는 커밋에서 `registry.json` `savings.hostedIn` 을 `"web"` → `"web-savings"` 로 |
| 2026-11-02 | MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — 셸 홈 → 도메인 요약 카드(투자 블록 · 매입가 숨김 잎 삭제)(`417076d8`). 파일 1개(경로 이동 내용 무변경 0 · 수정 1 · 추가 0 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로 |
| 2026-11-03 | MONEY-F2(`FE-REQ-054`) — 이 REQ 에 걸린 몫(`FE-REQ-054`) — 저축 탭은 `@repo/core/navigation` `APP_TABS` 에서 `readyBy: "FE-REQ-056"`(비활성 "준비 중"). 저축 첫 화면(`/goals`)이 생기면 `readyBy: null` 로 · zone 레이아웃에 `AppShell` + `VIEW_TRANSITION_CSS`(투자 zone 레이아웃과 같은 꼴) · `next.config.js` 를 vanilla-extract 로 감싼다 |
| 2026-11-03 | **in-progress** — F3a `c60f5bfb`(BREAKING `ROUTES.addGoal` → `/goals/new` · 셸 목표 코드 삭제) · `b1c8ad67`. FR-1 · 3 done, FR-2 · 4 · 5 · 7 부분, FR-13 미충족(`FE-REQ-013`). 수용 기준 4/4. `registry.json` hostedIn · `APP_TABS` readyBy 넘겨받은 몫(052 · 054) 닫음 |
| 2026-11-03 | 미검증 닫기 — 셸 경유(3010 → rewrites → 3003) 만들기 · 홈 카드 → `/goals` · 저축 탭 `aria-current` · 옛 `/goals/addgoals` → `/goals/new` · 앱 웹뷰 390(안내 꺼짐 · 넘침 0) · 일반 390(안내 켜짐). 결함 1 `b0768194`('새 목표' 기본 밑줄 링크) · `degraded` 문장(`2c998117`) |
| 2026-11-03 | `c82be47c` — ⑦ `reached` 문장 · ⑩ `formatWon` 한 곳 · `issuedAt` 타입 제거 |
| 2026-11-03 | FR-13 **done** — 저축 목록 · 상세가 서버에서 쿠키로 BFF 를 불러(1.5초 상한 · 실패면 null) `initialData` 로 — 첫 숫자가 HTML 에. `/goals` 는 이제 동적 렌더(ƒ)(`0ef25f6b`) |
| 2026-11-03 | MONEY-S1b(F3b) — `84871e70` `ProgressScene` · `6ad345fc` 저울 · 장면 · 실물 · 비상시 · 놓친 달 · 도장 · 엽서 · `5171d03d` 리뷰 반영(기한 문구 · 상한 서버 값 · 오류 문구 · 요청 함수 한 곳) · `88ede7aa` 첫 도장 미리보기. FR-4 · 6 · 8 · 9 · 10 done, FR-2 · 7 부분. FR-6 슬라이더 → 입력칸 정정. 번들 `/goals` 146 → 149 · `/goals/[id]` 146 → 150 kB |
| 2026-11-03 | MONEY-S1b 미검증 닫기(사용자 "확인 못한거 다 확인") — 셸 3010 경유 13단계 실측 · `/api/session` 404 없음 · 결함 1(0% 이자 8원) 서버 `4fda31db` + 화면 `cd3bc574`(마지막 달 한 줄 · 작은 금액 사유) |
| 2026-11-03 | MONEY-S1b 리뷰(high) — `9f74c874` 대출 줄 "처음 k개월 · 나머지" · 1달 "한 번에" · 나눌 수 없으면 대출 칸만 사유(꺼내기 칸 유지) · 필드 없을 때 NaN 경로 제거. 번들 `/goals/[id]` 150 kB 그대로 |
| 2026-11-03 | MONEY-S1b 리뷰 3차 — `6f90828c` 대출 칸 대체 문구(빈 · 모르는 사유 → 중립 문구, 오류처럼 보이지 않게) |
| 2026-11-03 | MONEY-S1b 리뷰 4차 — `d4f948a4` 꺼내기 쪽 모르는 사유 · 빈 오류 코드 대체 문구 |
| 2026-11-03 | MONEY-S1b 리뷰 5차 — `0e8c0f05` 원 단위 입력(점 뒤 버림) · `not_reachable` 이유 문구(`ProjectionReason` 에 추가) · `EMERGENCY_AMOUNT_NOT_WHOLE` 문구 · `labelOr` 헬퍼. 번들 `/goals/[id]` 150 → 151 kB |
| 2026-11-03 | MONEY-S1b 리뷰 6차 — `e0a0961b` 금액 칸은 점이 든 입력을 받지 않는다(이전 값 유지) · `labelOr` 자기 키만 |
| 2026-11-03 | MONEY-S1b 리뷰 7차 — `68f6ac41` 키 조회 헬퍼 `labelOr`(entities, 전 조회처 — 적립 폼 둘 포함) · `not_reachable` 중립 문구 · 전각 소수점 거절 + 안내 · 놓친 달 degraded 문구 |
| 2026-11-03 | MONEY-S1b 리뷰 8차 — `cdeb5f7c` · `ac23eaaf` 금액 입력 허용 목록 + 안내(전 칸) · `labelOr` shared. 번들 `/goals/new` 126 → 127 kB |
| 2026-11-03 | MONEY-S1b 리뷰 9차 — `641a11db` core 숫자 입력 규칙 + 허용표 40 · `92b0e947` 칸 종류별 안내 · 초기화 · 개월 칸 · 상세 degraded 타입 |
| 2026-11-03 | MONEY-S1b 리뷰 10차 — `bd571eae` · `d21bd5c1` · `c786ab91` 입력 규칙 price · 칸별 안내 · 묶음 한 곳(core 테스트 64) |
| 2026-11-03 | MONEY-S1b 리뷰 11차 — `5afe2476` · `5fd864d1` · `e8fe98fe` 숫자 칸을 `useNumberFields`(값 + 안내 한 덩어리)로 · 안내는 칸 아래 · 길이 상한. 번들 `/goals/[id]` 152 kB |
| 2026-11-03 | MONEY-S1b — 옛 `formatAmountInput` 삭제(소비처 0 — 남겨 두면 같은 결함이 돌아온다) |
| 2026-11-04 | 가계부 S1a(`MONEY-S1-household-entry`) — `web-savings` README 낡은 문장("빈 골격 · 서비스 앱 web") 정정(`df45ae7d`) |
| 2026-11-04 | 가계부 S1d(`MONEY-S1d-household-challenge`) — 목표 상세 적립 줄에 출처 `saved_by_challenge` 면 "챌린지로 아낀 돈"(실제 적립과 구분 — F013 FR-19)(`23d44bb6`). 번들 `/goals/[id]` 154 kB. 장면 · 도장은 같이 센다(저축 S2 에서 따로 보기) |
| 2026-11-05 | FE-REQ-013 FR-80 2단계 쿠키 세션(`feat/fe-req-013-fr80-cookie-session`, 루트 `requirements/specs/done/F000-cookie-session-slice.md`): FR-13 서버 조회 둘이 절대 주소 `BFF_SERVER_URL`(브라우저 `INVESTMENTS_BASE_URL` 은 같은 origin 빈 문자열)(`721063fc`) |
| 2026-11-05 | FE-REQ-013 FR-80 2단계 확인 단계: 이 REQ 가 주인인 화면 파일의 낡은 이유 주석("토큰이 `localStorage` 라 클라이언트")에 정정 문장(`95829941`, 주석만 · 동작 0). 서버 조회 이관은 `FE-REQ-013` FR-81(국내 주식은 약관상 대상 아님). 루트 `requirements/specs/done/F000-cookie-session-slice.md` |

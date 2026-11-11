---
id: FE-REQ-038
feature: F008
area: fe
kind: UI
title: "F008 슬라이스 19 — 상세 분석 가격 변동 범위 카드 (소유자 전용)"
priority: high
created: 2026-09-24
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

> **정정 2026-11-11 — 해설 스트림 은퇴**(F017 v2 단계 3, `feat/f017-s3-explain-always`). 해설은 배치가 미리 만든 것을 읽는다 — `GET /api/app/ai-coach/explanation`(4단, `BFF-REQ-052` FR-2 · `SRV-REQ-053` FR-3 · `FE-REQ-064` FR-2). 아래 `POST …/explain` · `…/explain/stream` 과 그 중계 · 화면은 지웠다(소비처가 같은 PR 에서 옮겨 감 — 제거 = 404). 기록으로 둔다.

| FR | 내용 | FEATURE-008 | 상태 |
|---|---|---|---|
| FR-1 | 기간별 90% 범위 띠(가운데 50% 굵게 · 중앙값 · 기준가 점선) + 가격 표 | FR-65 | FR-8 로 대체 |
| FR-2 | "이 주에 판다면" — 보유 수량 기준 평가금액 변화(서버 값), 부호 문자 + 국내 색 | FR-65 | 완료 |
| FR-3 | 성적 — 실제 적중 · 범위 폭(단순 예측 대비) · 표본을 **한 줄에**, 백테스트 라벨 | FR-10 · 67 | 완료 |
| FR-4 | 빗나간 때 · 꺼 둔 기간 사유 | FR-66 | 완료 |
| FR-5 | 비소유자(404) · 로그아웃 · 불러오는 중 → **자리 자체가 없다** | ADR-003 | 완료 |
| FR-6 | 선이 그려지고 → 범위가 펼쳐지고 → 하이라이트가 뜬다 · `prefers-reduced-motion` 이면 즉시 | FR-62 · 64 | 완료(FR-8 로 개정) |
| FR-8 | 상자 그림 → **선 + 부채꼴 차트**. 과거 8주 일봉 실선 · "지금"에서 펼쳐지는 90%/50% 범위 · 점선 중앙값. 과거 : 미래 폭 58 : 42 | 사용자 "이 차트는 사람들이 모를거같에" | 완료 |
| FR-9 | 실시간 현재가 점이 "지금"에서 숨 쉬고 값이 오면 미끄러진다(WS, 500ms throttle). 차트 선은 마지막 일봉에서 끝난다 | FR-62 | 완료 |
| FR-10 | 기간 하이라이트 — 1주 → 2주 … 자동으로 넘기고(2.8초), 칩으로 고르면 멈춘다. 고른 기간의 범위 · 중앙값 · "이 주에 판다면"이 아래에서 올라온다. 줄인 모션이면 자동 넘김 없음 | FR-62 · 64 | 완료 |
| FR-11 | 차트는 `aria-hidden`, 같은 숫자를 화면 밖 표로 읽는다 | a11y | 완료 |
| FR-12 | 상세 머리 가격 · 변동률 실시간 — 서버 값으로 먼저 그리고(SEO) WS 가 오면 바꾼다. 바뀔 때 색 밑줄이 한 번 스친다 | 사용자 요청 | 완료 |
| FR-14 | 쏠림 신호 카드 — 선물 펀딩비(8시간 비율 · "1년 중 상위/하위 N%" 상태 칩 · 미결제약정 · 쏠림일 때만 "통상 해석" 한 줄) · 김치 프리미엄(값 · 확정 부호와 날짜 · 확정 전이면 한 줄 · ECB 환율과 날짜) · 지금 이어진 신호(`current`)의 과거 반응(주요 사건과 같은 `ReactionDetail` — 기간 고르기 · 같은 축 두 막대 · 빗나간 때). 판정 색 없음(중립 칩). 소유자만(404 = 자리 없음), 토큰은 `useHasAccessToken` | FR-32 · 53 | 완료(2026-09-27) |
| FR-13 | 주요 사건 카드 — 다가오는 일정(D-day · 서울 시각) · 한 번에 하나 펼침 · 하루/5일/20일 고르기 · "이 일정 뒤"와 "평소"를 같은 축에(0% 점선) · 평소 대비 움직임 배수 · 오른 비율 · 표본 · 선반영 · 빗나간 때 · 화면 밖 표. 호재 · 악재 없음, 줄인 모션이면 즉시 | FR-29~31 | 완료(2026-09-24) |
| FR-7 | 해설 SSE 스트리밍 — 단계 체크리스트(실제 이벤트) · 타자 표시 + 커서 · 검사 통과 AI 문장으로 교체 알림 · 뉴스 출처 칩(**2026-11-02 — 원문 링크 · 게시 시각 "N시간 전"**, 주소 없으면 이름만, 새 탭 + `noopener`, 스크린리더는 "매체 원문 새 탭에서 열기: 제목") · `source: template` 이면 "규칙 기반 설명" 배지. 글자 0개로 실패하면 판단 근거 문장. 줄인 모션이면 즉시. **판단이 막힌 모드(`renderable: false`)에도 카드 자리를 남긴다** — 제목 + "코치 판단이 열리면 AI 해설도 함께 열려요" + 서버 표본 수(`trackSample`). 버튼 · 성적 · 사례는 없다(FE-REQ-026 FR-135). 기준 20 은 프론트에 적지 않는다. 카드 위치는 주요 사건 바로 아래 · 내 계획 · 거래 기록 위 | FR-60~64 | 완료(2026-09-24) · 막힌 모드 자리 · 위치(2026-09-27) |

## Changelog

- 2026-10-23: F011 5e — 막힘 문구 4개(국내 상태, `FC-REQ-020` FR-9). 코인 경로에는 나오지 않는 사유

| 날짜 | 변경 |
|---|---|
| 2026-10-28 | `F000-api-error-normalize`(파일만 걸침) — 404 = 소유자 아님은 `hasApiStatus` · 해설 429 = 잠시 후 판정 그대로 · `StreamHttpError` → `ApiError`. 동작 변화: 연결 실패(`TypeError`) · 429 는 다시 부르지 않는다 |
| 2026-09-27 | FR-7 — 판단이 막힌 모드에서 해설 카드가 자리째 사라지던 것을 고쳤다(사용자 신고 "AI 코치해설은 왜 없어짐?"). C06(`6c18593`) 이후 판단 표본을 live 만 세면서 표본 20 미만 종목의 판단이 닫혔고, 카드가 `null` 을 돌려 기능이 없어진 것처럼 보였다. 자리 · 이유 · 표본 수만 남기고 3종 규칙은 그대로. 슬라이스 3(`68d6bd0`)이 거래 기록 폼 아래로 밀어 둔 해설 · 수익 플랜을 위로 되돌렸다. 사용자 결정(2026-09-27): 게이트 유지 · 이유 표시 · 위로 이동. 근거 `reports/checklists/FE-REQ-038.md` §2026-09-27 |
| 2026-09-27 | **F008 슬라이스 23 — FR-14 쏠림 신호 카드.** 주요 사건 카드의 반응 분포를 `ReactionDetail` 로 떼어 두 카드가 같이 쓴다(동작 변화 없음). 근거 `reports/checklists/FE-REQ-038.md` §슬라이스 23 |
| 2026-10-23 | **F011 슬라이스 5d — 국내 주식이 같은 카드를 쓴다.** `ForecastCard` 에 선택 prop `assetType`(기본 `crypto`). `kr_stock` 이면 거래일 안내 줄 · 기준가 "개장 전 · 직전 거래일 종가" · 시나리오 "기간 끝에 판다면 — 보유 N주". 코인 출력 무변경(prop 생략 = 이전과 같은 JSX). 문구는 `FORECAST_MESSAGES.kr`. 근거 `FE-REQ-041` FR-23 · `reports/checklists/FE-REQ-038.md` §슬라이스 5d |
| 2026-10-23 | 막힘 사유 문구 2개 — `not_sharper_than_baseline` "단순 예측보다 범위가 좁지 않아 꺼 둠" · `skill_not_significant` "단순 예측보다 낫다는 근거가 부족해 꺼 둠"(국내 거부권 · 풀링 패배, ADR-003 §8). 없으면 "지금은 보여 드릴 수 없어요" 로 떨어졌다 |
| 2026-11-02 | **FR-7 출처 칩 → 원문 링크 + 게시 시각**(FEATURE-008 FR-44 · `SRV-REQ-037` FR-12). `ExplainCitation` 에 `url` · `publishedAt`(`@repo/core`). 시각 문구는 클라이언트(`formatRelativeTime`). 초점 표시는 다른 폼과 같은 `neutral[800]`. 루트 `requirements/specs/done/F008-explain-citations-slice.md` |
| 2026-11-02 | 해설 카드 끝 문구 — 흘린 문장("Claude 문장을 한 문장씩 검사해 보여 드렸어요") · 공급자별 교체 알림. 근거 `FE-REQ-059`. 루트 `requirements/specs/done/F008-explain-llm-routing-slice.md` |
| 2026-11-02 | F008 슬라이스 24 국내 증시 일정(`feat/f008-slice24-kr-market-events`): `EventsCard` 가 국내 · 미국 섞임을 그린다 — 지역 표시 · 짧은 이름 · 범위 묶음 · 국내 안내 문구(`FE-REQ-046` FR-1 · 2). 종류 이름은 `@repo/core/coach` 한 벌 |
| 2026-11-02 | MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — shared 레이어 → `@repo/web-shared`(import 경로 치환)(`20971abf`) · 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`) · 조회 훅 렌더 중 `localStorage` 토큰 읽기 → `useHasAccessToken`(`/search` 수화 불일치 수정)(`b4a59677`). 파일 11개(경로 이동 내용 무변경 4 · 수정 7 · 추가 0 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로 |
| 2026-11-04 | `ForecastFanChart` 의 렌더 중 `Date.now()` 두 줄에 `no-render-read` 예외 주석 — 전망은 소유자 전용 조회라 마운트 뒤 브라우저에서만 그려진다(서버 렌더에 없음, `DEV-001`) |
| 2026-11-05 | FE-REQ-013 FR-80 2단계 쿠키 세션(`feat/fe-req-013-fr80-cookie-session`, 루트 `requirements/specs/done/F000-cookie-session-slice.md`): 파일만 걸침 — `packages/domain-invest/src/entities/coach/api/useSymbolEvents.ts` `packages/domain-invest/src/entities/coach/api/useSymbolForecast.ts` `packages/domain-invest/src/entities/coach/api/useSymbolPositioning.ts`(이 REQ 가 머리 주석 주인)에서 토큰 헤더(`authHeader()`)를 뺐다 · 로그인 여부 `useHasSession`. 토큰은 httpOnly 쿠키 · 같은 origin 이라 브라우저가 싣는다(`721063fc`). 화면 · 동작 무변경 |
| 2026-11-10 | F017 v2 단계 1(`f7ce96dc` · `41447893`) — 해설 카드 막힌 모드 분기 삭제 · 성적 · 사례 중복 제거(판단 카드가 3종을 늘 보임) |
| 2026-11-11 | 해설 스트림 카드 **은퇴** — 늘 보이는 4단 해설 칸(`FE-REQ-064` FR-2). `@repo/core` `explainStream.ts` → `explanation.ts` — F017 v2 단계 3(`feat/f017-s3-explain-always`) |

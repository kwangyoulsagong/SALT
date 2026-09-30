---
id: SLICE-F004-BFF-SYMBOL-JUDGMENT
title: "F004 슬라이스 3 — 종목 판단 뷰모델 (BFF)"
priority: high
labels: [F004, slice, bff, coach, viewmodel, render-gate]
created: 2026-09-22
---

## Summary

**슬라이스 1·2 에서 서버가 낸 `modes.*` · `zone` · `gaugeTrackRecords` · `disclaimer` 를 화면까지
보낸다.** `GET /api/app/ai-coach/detail` 이 `SymbolCoachViewModel` 이 된다. 투자 우측 AI 코치
패널과 상세 분석 페이지가 이 한 모양을 쓴다.

같이 닫는 것: `mapDecision` 의 **`confidence` 복사**(D3) · `preview` 의 **"관망" 기본 라벨**(FR-93).
서버는 이미 `confidence` 를 보내지 않는다 — BFF 가 `undefined` 를 옮기고 있었다.

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `BFF-REQ-023` | FR-90~98 | 두 모드 전달 · `confidence` 제거 · 기본 라벨 제거 · `mode` 기본값 서버 위임 · `zone`/게이지/`validity` 무가공 · 뉴스 병렬 |
| `BFF-REQ-023` | FR-99 | `preflightDefaults` 에 목표가 없음 |
| `BFF-REQ-024` | FR-31~35 | 모드 블록 `renderable` 판별 union · `confidence` 없는 타입 |
| `BFF-REQ-025` | FR-22 · FR-40~43 · FR-45 | 면책 없으면 502 · 모드 계약 깨지면 `null` · 병렬 · 계약 스냅샷 |
| `BFF-REQ-026` | FR-50 · FR-51 · FR-52 | 200ms 예산 · 모드 전환 무호출 · 클라이언트 종료 시 upstream 취소 |

## 판단 — 리뷰가 볼 곳

1. **막힌 모드에서 `judgment` · `trackRecord` 를 떨어뜨린다.** 서버는 `renderable: false` 에도
   점수 · 라벨을 싣는다. BFF 가 판별 union 으로 접어서 막힌 판단의 점수가 화면에 새어 나갈 길을
   **타입에서** 없앤다(`BFF-REQ-024` FR-31). 표본 수만 `trackSample` 로 남긴다.
2. **계약이 깨진 모드는 `null` + `degradedFields: ['modes.scalp']`.** `renderable` 이 불리언이
   아니거나, `true` 인데 성적표 · 실패사례 · `scoreNote` 가 비었거나, `zone` 이 없으면 그 모드를
   내보내지 않는다. 게이트 판정처럼 보이지만 **막는 방향만 있고 여는 경로가 없다.** REQ 는
   "모드를 `unavailable`" 이라고만 했다 — 새 `blockedReason` 을 지어내지 않고 `null` 로 정했다
   (`bff-architecture.md` §5 "실패는 `null`").
3. **면책 문구가 없으면 응답 전체가 502 `coach_unavailable`.** 면책은 정책이다(`BFF-REQ-025` FR-22).
4. **`riskGuard` 에서 보유 금액(`currentValue` · `unrealizedProfitRate`)을 뺐다.** REQ 뷰모델에
   없는 필드이고 판단 패널이 쓰지 않는다. 필요해지면 뷰모델에 추가한다.
5. **뉴스에 `url` 을 남겼다.** REQ 모양은 `{id, title, source, publishedAt}` 인데 기사 링크 없이는
   카드가 쓸모없다. `summary` · `sentiment` 는 뺐다(B11 은 F000 소관).

## BREAKING — `/api/app/ai-coach/detail` 응답

`header` · `decisionCards` 가 사라지고 `modes` 가 생겼다. **프론트 소비처가 0건**이라(검색:
`salt-microFe/apps` 에서 `ai-coach/detail` 없음, `streaming-probe` 는 `preview` 만 잰다) 지금
깨지는 화면은 없다. `preview` 의 `badge` 는 판단이 없으면 `null` 이 된다(문자열 → `string | null`).

## 범위 밖

| 항목 | 언제 |
|---|---|
| 뷰모델 타입을 `packages/core` 로(`BFF-REQ-024` FR-30) | FE 패널 슬라이스 — 소비처가 생길 때 옮긴다. BFF 가 `salt-microFe` 를 import 하는 경로가 아직 없다 |
| `assetType` 필드 · `defaultMode` 반영(FR-48) | 서버가 아직 안 준다 — F004 서버 후속 |
| `explain` 인증 · 20s · 동시 2 (FR-100 · `BFF-REQ-025` FR-1~12) | 다음 BFF 슬라이스 |
| `/coach/report` · `scoreboard` · `generation-status` · 429 | 다음 BFF 슬라이스 |
| upstream GET 재시도 1회 | BFF 공통 재시도 유틸이 없다 — 공통으로 한 번에 |
| 게이트 미렌더 카운터(FR-7 · `BFF-REQ-026` FR-40 · FR-54) | 관측 인프라 미정 |
| FE 패널(`FE-REQ-026` K절) | 다음 슬라이스 |

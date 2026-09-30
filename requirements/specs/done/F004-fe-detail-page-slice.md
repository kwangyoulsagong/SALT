---
id: SLICE-F004-FE-DETAIL-PAGE
title: "F004 슬라이스 6 — 상세 분석 페이지 · 해설 (FE)"
priority: high
labels: [F004, slice, fe, coach, detail, explain, render-gate]
created: 2026-09-22
---

## Summary

**우측 패널의 ⑦ [상세 분석 보기]가 갈 곳을 만든다.** `/investments/[symbol]` 이 패널과 같은
`GET /api/app/ai-coach/detail` 을 읽어 Hero · 차트 + 구간 오버레이 · 코치 카드(근거 · 위험 · 3종) ·
수익 플랜을 그리고, [해설 보기]를 눌렀을 때만 `POST /api/app/ai-coach/explain` 을 부른다.
슬라이스 5 가 explain 에 인증 · 동시 2 · 429 `explain_busy` 를 붙였고, 이 화면이 그것을 처음 소비한다.

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `FE-REQ-026` | FR-119 · FR-130~134 · FR-135 · FR-136 · FR-137 · FR-138 · FR-102 | 패널 ⑦ · 페이지 · Hero · 오버레이 · 코치 카드 · 해설 카드 · 수익 플랜 · 모드 연동 |
| `FE-REQ-028` | FR-10~13 · FR-62 · FR-86 · FR-88 | 해설 버튼만 · 재시도 0 · `AbortSignal` · 20s · 실패 시 규칙 기반 · 관심 추가 분리 |
| `FE-REQ-029` | FR-1 · FR-5 · FR-52 · FR-73 · FR-74 · FR-75 | 해설 자동 호출 0 · `aria-busy` · 오버레이는 기존 차트 · `"use client"` 잎 |
| `BFF-REQ-026` | FR-6 (소비) | 해설 버튼 디바운스 |

## 판단 — 리뷰가 볼 곳

1. **상세 페이지도 클라이언트 조회다.** REQ(`FE-REQ-028` FR-84)는 서버 컴포넌트 1회 조회를 적었지만
   토큰이 `localStorage` 에 있어 서버가 볼 수 없다(`FE-REQ-013` 전). 패널과 **같은 쿼리 키**를 쓴다 —
   FR-84 가 걱정한 "두 경로의 staleness 가 갈린다"는 경로가 하나면 생기지 않는다
2. **오버레이는 `@repo/ui` `PreviewChart` 에 `priceLines` prop 을 더했다.** 차트 라이브러리 추가 0
   (`FE-REQ-029` FR-73). 선이 화면 밖으로 나가지 않게 y 범위에 선 가격을 포함한다 — 그러면 캔들이
   납작해질 수 있다(회고). 선 가격은 서버 값을 그대로 쓰고 zone → 선 매핑은 `entities/coach` 순수 함수다
3. **`market` 은 `coach` 를 모른다.** 차트는 `priceLines` 를 슬롯처럼 받기만 하고, 매핑과 조합은
   위젯(`widgets/symbol-analysis`)이 한다 — 슬라이스 4 의 `coachSlot` 과 같은 방식
4. **해설은 `mode` 가 바뀌면 버린다.** 카드를 `key={mode}` 로 다시 만들어 진행 중 요청은 끊고
   "다시 보기" 상태로 돌아간다(FR-138). 언마운트 · 모드 전환 · 20s 가 같은 `AbortController` 를 끊는다
5. **해설 실패는 오류 화면이 아니다.** 429 `explain_busy` 는 "잠시 후 다시", 그 외 실패 · 타임아웃은
   판단의 `headline` · `reasons`(규칙 기반 문장)를 `규칙 기반 설명` 배지와 함께 보여준다(FR-62)
6. **서버 응답의 `timeframe` 을 그리지 않는다**(FR-136). 기간은 `validity.code` 하나다
7. **종목명 · 거래대금은 시세 목록에서 찾는다.** 해설 요청이 `koreanName` · `tradeValue24h` 를
   요구하는데 뷰모델에 없다. `overview?search=` 결과에서 **심볼이 정확히 같은 행**만 쓴다. 없으면
   (주식 · 상장 폐지) [해설 보기]를 비활성으로 두고 사유를 쓴다

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 주문 전 체크(FR-150~156) · Hero [주문 전 체크] | 서버 `/trade-preflight` 가 `stopPrice` 만 받고 `stopLossRate` · `maxLossOfTotalRate` 가 없다. 프론트가 % → 가격을 환산하면 공통 수용 기준 3 위반 | F004 서버 후속 (`salt-server` 명시 필요) |
| 차트 기간 탭 `1주` | 서버 차트가 `minute`(1·3·5·15·30·60·240) · `day` 만 준다. 5탭으로 둔다 | 서버에 `week` 가 생길 때 |
| 해설 응답의 `renderable` 판별 union(FR-86 후반) | 서버 explain 응답에 `renderable` 이 없다. 막힌 판단은 버튼 자체를 그리지 않는 것으로 처리 | F004 서버 후속 |
| 수익 플랜 "거래 기록 추가" 진입(FR-137 후반) | 거래 기록 추가 화면이 없다 | F006 |
| 화면 이탈 → 서버 LLM 호출 중단 | FE → BFF 중단은 실측(`ERR_ABORTED`). **서버 `explain` 에 abort 가 없어** Gemini 호출은 끝까지 돈다 | F004 서버 후속 |
| 상세 차트 실시간 캔들 | 프리뷰 실시간 훅이 프리뷰 쿼리 키에 묶여 있다 | 후속 (필요하면) |

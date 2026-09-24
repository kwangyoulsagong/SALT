---
id: FC-REQ-004
feature: F008
area: forecast
kind: DATA
title: "F008 슬라이스 16b — 바이낸스 파생 · 스테이블코인 · 거시(FRED) 수집 + 변동 범위 게이트"
priority: high
created: 2026-09-23
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

## Summary

바이낸스 미결제약정은 **최근 30일만** 준다 — 오늘 시작하지 않으면 그 앞은 영영 없다. 그래서 피처로 쓰기 전에 수집부터 시작한다.
같은 슬라이스에서 사용자 결정 "변동 범위 켜고"의 게이트 분리를 넣는다.

## FR

| FR | 내용 | FEATURE-008 |
|---|---|---|
| FR-1 | 바이낸스 선물 미결제약정(USD, 1시간) — 업비트 원화 ∩ 바이낸스 USDT 무기한 | FR-32 |
| FR-2 | 바이낸스 펀딩비 전체 이력(2022-09~), 증분 | FR-32 |
| FR-3 | 바이낸스 USDT 현물 일봉 — 김치 프리미엄 분모 | FR-53 |
| FR-4 | DefiLlama 스테이블코인 총 발행량(available_at = 다음 날) | FR-32 |
| FR-5 | FRED 9종(금리 · 환율 · 지수 · VIX · CPI) **ALFRED 빈티지**(available_at = 빈티지 시작 다음 날) | FR-50~52 |
| FR-6 | 공통 HTTP(타임아웃 · 429/5xx 재시도 · pacer · 오류에 키 없음) | — |
| FR-7 | 게이트 분리 — `range_renderable` · `range_blocked_reason` | FR-6 |
| FR-8 | 끊긴 실행 정리(`ok = null` 6시간 → `interrupted`) | — |

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 이 데이터를 피처로 · 채점 | 수집이 먼저. 채택은 채점이 정한다(FR-54) | 슬라이스 20 |
| 김치 프리미엄 계산 | 피처 층(시점 고정 환율 필요) | 슬라이스 20 |
| 한국은행 ECOS | FRED `DEXKOUS` 로 원/달러가 된다 | 필요 시 |
| cron | 미결제약정 때문에 **매일** 돌아야 한다 — 로컬 운영 방식 결정 필요 | 슬라이스 17 전 (급함) |

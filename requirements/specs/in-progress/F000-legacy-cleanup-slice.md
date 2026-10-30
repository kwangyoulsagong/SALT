---
id: SLICE-F000-LEGACY-CLEANUP
title: "F000 슬라이스 — 레거시 AI 분석 모델 drop · \"중복 시세 워커\" 정정"
priority: medium
labels: [F000, slice, server, db, migration, cleanup]
created: 2026-10-30
---

## Summary

사용자 "새 브랜치 파고 다음꺼 진행" — 마스터 인덱스 §4-1 순위 2 의 다음 줄(`FEATURE-000` FR-1 · 2).

1. **FR-1 레거시 모델 drop.** `AIAnalysisSession` · `AIAnalysis` · enum `AnalysisStatus` · `PredictionType` 이 코드 참조 0 인데 스키마에 남아 있었다.
   마이그레이션 `20261030160000_drop_legacy_ai_analysis`(`DB-REQ-003` M4)
2. **FR-2 "중복 워커 제거"는 전제가 틀렸다 — 지우지 않고 정정으로 닫는다.** 스펙은 서버 `market-price-update` 와 BFF `price-updater.worker` 가
   같은 가격을 두 번 쓴다고 봤다. 코드는 그렇지 않다:

| 경로 | 쓰는 테이블 | 읽는 쪽 |
|---|---|---|
| 서버 `market-price-update`(매분 · launchd 상시) | `market_assets` | 코치 판정 · 주문 전 체크 가격 신선도(`inputFreshness` · `preflight`) · 판정 원장 진입가 · 시장 표 · 고래 신호 |
| BFF `price-updater.worker`(5초 · 별도 프로세스) | `investment_watchlist` · `portfolio_holdings` | 관심 목록 · 보유 평가 |

서버 잡을 지우면 `market_assets` 를 쓰는 경로가 화면 조회 때의 보조 갱신(`refreshStalePrices`)만 남아 판정이 stale 로 막힌다.

## 착수 전 네 질문 (`msa-services.md` §1)

| 질문 | 답 |
|---|---|
| 어느 서비스 | `market`(S5 전 — Express). 레거시 두 테이블은 주인 없음(죽은 모델) |
| 어느 단계 | Express · Prisma 마이그레이션 |
| 테이블 주인 | `market_assets` = market. 다른 스키마 조인 없음 |
| BFF 계약 | 무변경 |

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `SRV-REQ-007` | FR-1 · FR-2 | FR-1 닫힘 · FR-2 정정(수용 기준 "중복 없음 확인") |
| `DB-REQ-001` | FR-1~3 | 모델 2 · enum 2 · `User` 관계 필드 2 제거 |
| `DB-REQ-003` | M4 · FR-4 · 5 | grep 0 · `pg_dump -Fc` + 복원 테스트 1회 · to-do → in-progress |
| `SRV-REQ-010` | FR-30 · 33 · 34 | 정정 → 닫힘(단일 경로 = 서버 잡) |
| `BFF-REQ-010` FR-14 · `BFF-REQ-009` FR-33 · `SRV-REQ-011` FR-10 · 11 · `DB-REQ-004` FR-30 · 31 | — | 같은 전제를 쓴 문장 정정(머리 블록) |

## 판단 — 리뷰가 볼 곳

1. **FR-2 를 뒤집은 판단** — Must 요구를 구현하지 않고 정정했다. 근거는 위 표와 실측(같은 시각 `market_assets` 최신 29초, 관심 목록 · 보유 5시간 20분 — BFF 워커 프로세스가 떠 있지 않았다).
   상시 프로세스는 서버(launchd)뿐이고 `ADR-006` 도 수집을 서버 `market-ingest` 에 둔다
2. **마이그레이션 diff 의 인덱스 이름 2건을 뺐다** — `coach_recommendation_snapshots` 인덱스 이름 드리프트는 이 목적과 무관(1 마이그레이션 = 1 목적)
3. **코드에 주석 한 줄** — `market.worker.ts` 잡 위에 "중복 아님 · 지우면 판정이 막힌다". 같은 오독이 세 번째로 나오지 않게

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| BFF 워커가 상시 프로세스가 아니다 — 관심 목록 · 보유 가격이 워커를 띄운 동안만 갱신 | 운영 구성(launchd 에 BFF 없음) — 이 슬라이스는 문서 정정 | 배포 구성(`ADR-008` · `OPS-001`) |
| `investment_watchlist.current_price` 가 `market_assets` 가격의 사본이다 | 진짜 중복은 이쪽 — 읽는 화면 계약을 바꿔야 한다 | S5 `market` 이전(`SRV-REQ-049` FR-2) |
| `coach_recommendation_snapshots` 인덱스 이름 드리프트 2건 | 별도 목적 | 다음 coach 스키마 마이그레이션 |
| FR-5 README v1/v2 · FR-14 410 1주 로그 | 다른 줄 | FR-14 2026-11-03 · FR-5 미정(§4-1 순위 2) |

---
id: SLICE-F016-C-MOVE-SPLIT-FACTS
title: "F016 단계 C — 오늘 등락 나눠 보기(①) · 같은 날 사실(②) 카드"
priority: high
labels: [F016, forecast, server, db, bff, frontend, slice, invest]
created: 2026-11-09
status: done
---

## Summary

사용자 "새 브랜치 파고 다음 파이프라인 진행"(2026-11-09) — F016 전 영역 계획(`requirements/specs/in-progress/F016-why-moved-global-plan.md`) 단계 C.
한 줄 — **크게 움직인 날 국내 · 코인 상세에 "왜 올랐을까 · 떨어졌을까" 카드가 서고, 오늘 등락을 시장 · 업종 · 종목 몫(%p)으로 나눠 보이고, 같은 날 일어난 사실을 시각순으로 놓는다.** 문장(③)은 단계 D.

> **done 2026-11-09** — 커밋 `5d04cb3b`(DB) · `a109816b`(예측) · `78030f51`(서버) · `112c5876`(BFF) · `a18d861d`(FE) · `5d39099f`(요약 띠 — 사용자 요청).
> 영역 REQ 다섯 in-progress(남은 FR 은 단계 D). 검증 `requirements/reports/checklists/F016-C-move-split-facts.md`.

## 범위

| REQ | 이번 몫(단계 C) | 남는 몫 |
|---|---|---|
| `FC-REQ-027` | FR-1 국내 β(지수 · 업종, 120 거래일) · FR-2 코인 β(기존 `btc_beta` 옮겨 담기) · FR-3 export 뷰 + 평소 변동 σ(카드 조건 재료) | FR-4~6(단계 D 뒤 운영 측정) |
| `SRV-REQ-051` | FR-7 분해 · FR-8 카드 조건 · FR-9 같은 날 사실 · FR-10 코인 쪽 · 지수 · 업종 일별 이력 채우기(새 TR 하나) | FR-3 feed · 사이드카 · FR-5 외국인 · 기관 장중(원천) |
| `DB-REQ-041` | `forecast.move_beta` · `v_move_beta_export` · FR-7 코인 경보(새 열 대신 기존 스냅샷 뷰 — 정정) | FR-8(D) |
| `BFF-REQ-051` | FR-1 `why-moved` 두 경로 · 표 행 카드 표시 칸 | FR-1 의 `summary` · `gate`(D) · FR-7 ③ 예산 |
| `FE-REQ-063` | FR-1 ①② · FR-6 표 행 표시 | FR-1 ③(D) |

## 착수 전 네 질문(`msa-services.md` §1)

| 질문 | 답 |
|---|---|
| 서비스 | market(서버) · forecast(β 배치) |
| 단계 | Express(S5 전). 새 forecast 표 · 뷰는 Prisma 마이그레이션(S5 에 Flyway — `ADR-007`) |
| 표 주인 | `forecast.move_beta` = forecast(쓰기) · market 은 export 뷰만 읽는다(`v_upcoming_event` 선례). 지수 일별은 market(`kr_sector_index_daily`) — forecast 는 읽기만 |
| BFF 계약 | 새 경로 둘 · 기존 표 행에 칸 하나(추가만) |

## 판단 — 리뷰가 볼 곳

1. **지수 · 업종 일별 이력은 KIS 기간별 시세(`FHKUP03500100`)로 1년 채운다** — 단계 B 는 "일별이 오늘부터 쌓인다"였다. 그러면 β 를 120 거래일(약 6달) 뒤에야 쓴다.
   모의 키 실측(2026-11-09 08:40): 한 번에 50거래일 · 최신이 앞 · 2025년도 받힘 · 등락률 칸 없음(종가로 서버가 낸다). 지수 셋도 같은 표에(KIS 가 시장 지수를 업종 코드 `0001` · `1001` 로 다룬다)
2. **β · 평소 변동(σ)은 예측 배치가 매일 미리** — 시장 표 행마다 카드 조건을 보려면 요청 때 일봉을 집계하면 안 된다(`performance.md` §3). 서버는 뷰 한 번 읽기
3. **분해는 %p · 합 = 등락** — 고유 몫 = 등락 − 시장 몫 − 업종 몫(뺄셈이 정의). β 를 못 읽으면 β=1 + `market_adjusted` 라벨
4. **코인 유의 · 주의는 새 열을 만들지 않는다** — 매일 스냅샷 `forecast.v_market_warning`(F010 슬라이스 6)이 이미 같은 원천(공식 `market/all` 상세)을 쌓는다. 새 열은 같은 사실을 두 곳에 둔다
5. **응답에 쓰지 않는 칸을 두지 않는다** — ③(`summary` · `gate`)은 단계 D 가 칸과 같이 넣는다(단계 B 와 같은 선)
6. **업종 = 지수업종 중분류 우선**(구현 중 결함) — 대분류 0027 "제조업"은 코스피 556종목에 반도체가 지배해 동화약품 업종 β 가 −3.5 였다. 중분류(0009 제약 · 0013 전기·전자)가 실제 업종이다 — 마스터 칸 하나 · 서버 · 예측 같은 표 테스트
7. **카드 문턱은 분포로** — 지난 250 거래일 · 그 전 60일 σ 로 k · 최소 % 표를 내고 k 2.5 · 3% 로(국내 3.5% · 코인 3.1% — 종목당 한 달 0.7~0.9 번)
8. **사용자 요청 둘을 같은 브랜치에** — 프리뷰에도 "왜 떨어졌을까?" · 국내 프리뷰 뉴스(코인처럼) · 요약 띠 1440 잘림. 요약 띠는 레일(72) 뒤 화면 폭 판정이 낡은 결함이라 칸 폭 판정으로 고쳤다(따로 커밋)

## 검증 · 미검증

결과는 `requirements/reports/checklists/F016-C-move-split-facts.md`.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-09 | 신규(in-progress) — plan |
| 2026-11-09 | done — 판단 6~8 · 커밋 여섯 |

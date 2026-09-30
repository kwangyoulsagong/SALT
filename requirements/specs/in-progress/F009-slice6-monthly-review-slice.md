---
id: SLICE-F009-6-MONTHLY-REVIEW
title: "F009 슬라이스 6 — 월간 복기 · Brier · 진입 전 체크 · IPS 3문항 · 시나리오"
priority: high
labels: [F009, slice, db, server, bff, fe, contract]
created: 2026-09-27
---

## Summary

학습 루프가 닫힌다. 월초에 지난달(KST)을 한 번 정리해 저장하고(고치지 않는다) 코치 리포트에 보인다 — 이번 달 한 가지 ·
내 기준을 넘은 날 · 계획에 적은 "오를 확률"의 채점. 리스크 예산 패널에서 IPS 3문항(월 허용 손실 · 1회 최대 손실 — 원 또는 % ·
한 종목 상한)을 받고 "내리면 얼마"를 보인다. 거래 폼 계획 안에 본인 실수 태그에서 자란 질문 + 프리모템(기록만). 막지 않는다.

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| DB | `salt-server/requirements/specs/done/DB-REQ-031-F009-SCHEMA.md` | FR-11(`monthly_reviews`) · FR-12(`trade_plans.checklist`) — 마이그레이션 2, 추가만 |
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-038-F009-RISK.md` | FR-10a(시나리오) · 10b(Brier) · 10c(체크리스트) · 10d(한 종목 상한) · 10e(월간 복기) |
| BFF | `bff/requirements/specs/done/BFF-REQ-038-F009-TRADE-RISK.md` | FR-10(복기) · FR-11(Brier · 체크리스트 · 시나리오 · 상한) · FR-12(프리모템 · 체크리스트 기록) |
| 프론트 | `salt-microFe/requirements/specs/in-progress/FE-REQ-039-F009-TRADE-RISK.md` | FR-21~24 |

## 사용자 결정 (2026-09-27)

- 서버 포함 · 다섯 가지(월간 복기 · 시나리오 · IPS 3문항 · Brier · 진입 전 체크리스트)를 한 슬라이스로, 커밋만 나눈다
- IPS 3문항은 코치 대화 화면이 웹에 없어 **리포트 게이지 패널을 넓혀** 받는다
- Brier 는 **서버 채점만** — 폼에 오를 확률 칸을 더하지 않는다(추가 입력 2개 이내)
- 월간 복기는 **월초에 저장**(요청마다 계산하지 않는다) — 뒤에 태그를 고쳐도 그달 숫자가 남게

## 판단 — 리뷰가 볼 곳

1. **복기는 스냅샷이다** — `monthly_reviews` 한 달 한 행, 이미 있으면 계산하지 않는다. 배치(매일 06:40 · 부팅)와 첫 조회가 같은 유스케이스라 경합은 유니크 제약이 정리한다. 끝나지 않은 달은 만들지 않는다
2. **IPS 이탈은 지금 설정 기준** — 설정 이력이 없다. 응답 `basis: current_settings` 와 화면 한 줄로 밝혔다
3. **보유 대비와 이탈 일수가 같은 평가금** — `portfolioSeries` 로 뽑고 `benchmarkMirror` 를 옮겼다(값 불변, 슬라이스 4 테스트 그대로)
4. **Brier 기준 가격** — 적기 전 마지막 닫힌 종가. 적은 날 종가를 쓰면 적은 뒤의 움직임이 섞인다
5. **체크리스트만으로는 계획을 만들지 않는다**(BFF) — 계획이 생기면 "계획 없음" 자동 태그가 빠진다

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 코치 대화의 "내 미러 보여줘" | 대화 화면이 없다 | 코치 대화(F006) |
| 오를 확률 입력 칸 | 추가 입력 2개 이내(결정) | 사용 신호 |
| 설정 이력(당시 기준 이탈) | 이력 표 없음 | 설정을 자주 바꾸는 신호 |
| 연승/연패(FR-20) · 시간대(FR-22) · CVaR(FR-26) | Could | 후속 |

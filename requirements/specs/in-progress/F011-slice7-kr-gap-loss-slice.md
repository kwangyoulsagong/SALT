---
id: SLICE-F011-7-KR-GAP-LOSS
title: "F011 슬라이스 7 — 국내 주식 사이즈 계산 갭 손실 (FR-45)"
priority: medium
labels: [F011, slice, server, bff, fe]
created: 2026-10-26
---

## Summary

사용자 "새브랜치 파고 다음꺼 진행"(2026-10-26) → 남은 슬라이스 7(`SRV-REQ-040` FR-43~47) 다섯 중 **FR-45 갭 손실**을 골랐다(사용자 선택).
FR-43 은 국내 판단이 이미 반전형 규칙 · 국내 채점 풀 · 30일(≈ 21거래일)이고, FR-44 연도별 세율은 국내 채점이 2026-10 부터라 2025 매도가 없다 — 지금 바꿀 숫자가 적다.

국내 주식에서 "손절까지 가면 최대 −N원"은 하한이 아니다 — 밤사이 갭 · VI · 거래정지 · 연속 하한가 때 손절가에서 팔리지 않는다(리서치 권고 19).
그래서 손절 체결 가정 손실 옆에 두 줄을 **나란히** 둔다: 손절가 바로 위에서 다음 날 하한가로 열린 경우 · 그 종목 과거 하위 1% 갭으로 열린 경우.

| 영역 | REQ | 몫 |
|---|---|---|
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-040-F011-KR-STOCK.md` FR-45 | 정책 `krGapScenarios` · `market` `overnightGapStats` · size-check `gapScenarios` |
| BFF | `bff/requirements/specs/done/BFF-REQ-040-F011-KR-STOCK.md` FR-20 | 뷰모델 통과 · 묶음 검사 |
| 프론트 | `salt-microFe/requirements/specs/done/FE-REQ-041-F011-KR-STOCK.md` FR-24 | 거래 폼 세 줄 · 고지 |
| 주인 REQ(Changelog) | `SRV-REQ-038` · `BFF-REQ-038` · `FE-REQ-039` | 사이즈 계산 · 뷰모델 · `SizeCheckLines` 주인 |
| 짝(변경 없음) | 예측 · DB — DDL · 뷰 무변경 | — |

## 판단 — 리뷰가 볼 곳

1. **갭은 손절가 기준** — 진입가 기준 −30% 면 손절가를 깊게 둔 사람에게 손절 손실보다 작은 "갭 손실"이 나온다. 손절가 바로 위에서 마감한 다음 날 갭으로 열린 경우로 정했다(두 줄 ≥ 손절 손실 — 테스트)
2. **원천 끊김 경계 0.69~1.31** — 예측 `kr_breaks` 1.31 과 같은 근거(진짜 상한가 반올림 1.3008), 아래는 대칭. 실데이터 0.69 아래 4건이 전부 미수정 분할 · 병합이었다. 정리매매 하락도 같이 빠진다 — 그 위험은 하한가 줄 + "연속 하한가에는 끝이 없다" 문구가 말한다
3. **"최악"을 고르지 않는다** — 세 줄을 같은 굵기로, 하위 1% 옆에 관측 최악 · 기간 · 표본을 같이. 연속 하한가는 상한이 없어 어느 줄도 진짜 최대가 아니다
4. **계약은 추가만** — size-check `gapScenarios`(코인 · 매도 · 손절가 없음 `null`). 코인 화면 · 응답 무변경

## 검증 · 미검증

`requirements/reports/checklists/F011-slice7-kr-gap-loss.md` · 회고 `requirements/reports/retrospects/F011-slice7-kr-gap-loss.md`.

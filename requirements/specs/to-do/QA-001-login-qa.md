---
id: QA-001
area: global
kind: QA
title: "로그인 QA — 실제 계정 · 실제 서버로 한 번에 닫는 미검증 항목"
priority: high
created: 2026-09-30
source: 2026-09-30 REQ 감사 — 체크리스트 28개의 "언제 닫히나" 가 날짜 · REQ 없이 "로그인 QA(사용자)" 로만 적혀 있었다(pr-convention §2: 비면 잊힌 것)
---

## Summary

자동 작업(에이전트)은 **로컬 로그인 토큰을 만들지 못한다**(권한 분류기가 막는다 — 비밀번호를 모른다). 그래서 기능마다
"인증된 HTTP 왕복 · 실제 계정 화면"이 미검증으로 남았고, 그 칸이 흩어져 잊히기 쉬웠다. 이 REQ 가 그 항목들의 **닫히는 곳**이다.
사용자가 로그인한 브라우저에서 아래를 한 번에 돌리고, 결과를 각 체크리스트에 적는다.

## 시나리오

| # | 무엇을 | 확인 | 원래 체크리스트 |
|---|---|---|---|
| Q-1 | 실 토큰으로 서버 → BFF → 화면 왕복 — 코치 리포트 · 목표 비중 · 리스크 예산 · 미러 · 태그 확정 · 월간 복기 · 성적표 · 가격 범위 · 사건 · 쏠림 | 각 경로 200 · 화면에 오류 문구 없음 · 값이 서버 응답과 같음 | F009 · F010 슬라이스 · `SRV-REQ-024` · `037` · `038` · `BFF-REQ-037` · `038` · `039` · `041` |
| Q-2 | 거래 폼 저장 왕복 · 투자금 저장 → 목표 비중 부족분 전환 | 저장 뒤 새로고침에도 남음 · 부족 · 초과 · `no_room` 이 설명대로 | `FE-REQ-039` · `042` · `BFF-REQ-041` |
| Q-3 | 성능 — size-check p95(< 200ms 서버 + BFF 20ms) · 복기 첫 조회 | 개발자 도구 Network 20회 | `SRV-REQ-038` · F009-slice1 · slice6 |
| Q-4 | 사람이 재는 것 — 거래 1건 + 계획 입력 30초(5회 평균) · 200% 확대 · 색맹 시뮬레이션 | 시간 · 깨짐 · 색만으로 구분하는 곳 없음 | `FE-REQ-038` · `039` · F009-slice3 · slice7 |
| Q-5 | 실데이터 화면 — 알트 보유 계정 목표 비중 · 투자유의 종목 상세(`exchange_warning`) · 주의 한 줄 | 문구 · 막힘이 설명대로 | `FE-REQ-040` · `042` · F010-target-weight-v2 · slice6 |
| Q-6 | 표본이 쌓인 뒤 — 판단 유형 표본 ≥ 20 이 되어 판단 카드가 열리는 순간 · 청산이 쌓인 계정의 연속 · 시간대 | 3종 고지가 같이 열림 | `FE-REQ-026` · `038` · F009-slice7 — **날짜 게이트**(채점 누적) |

## 원래 체크리스트 (행 수)

| 체크리스트 | 행 |
|---|---|
| `bff/requirements/reports/checklists/BFF-REQ-037.md` | 1 |
| `bff/requirements/reports/checklists/BFF-REQ-038.md` | 7 |
| `bff/requirements/reports/checklists/BFF-REQ-039.md` | 2 |
| `bff/requirements/reports/checklists/BFF-REQ-041.md` | 2 |
| `requirements/reports/checklists/F008-slice23-positioning.md` | 2 |
| `requirements/reports/checklists/F009-slice1-plan-sizing.md` | 1 |
| `requirements/reports/checklists/F009-slice2-realized-vol.md` | 1 |
| `requirements/reports/checklists/F009-slice3-trade-form.md` | 2 |
| `requirements/reports/checklists/F009-slice4-adherence-mirror.md` | 1 |
| `requirements/reports/checklists/F009-slice5-mirror-screen.md` | 2 |
| `requirements/reports/checklists/F009-slice6-monthly-review.md` | 2 |
| `requirements/reports/checklists/F009-slice7-streak-timeofday.md` | 4 |
| `requirements/reports/checklists/F010-slice0-scorecard-integrity.md` | 2 |
| `requirements/reports/checklists/F010-slice2-regime-vol.md` | 1 |
| `requirements/reports/checklists/F010-slice3-judgment-screen.md` | 2 |
| `requirements/reports/checklists/F010-slice5-target-weight.md` | 1 |
| `requirements/reports/checklists/F010-slice6-independent-data.md` | 1 |
| `requirements/reports/checklists/F010-target-weight-v2.md` | 1 |
| `salt-microFe/requirements/reports/checklists/FE-REQ-026.md` | 1 |
| `salt-microFe/requirements/reports/checklists/FE-REQ-038.md` | 3 |
| `salt-microFe/requirements/reports/checklists/FE-REQ-039.md` | 9 |
| `salt-microFe/requirements/reports/checklists/FE-REQ-040.md` | 4 |
| `salt-microFe/requirements/reports/checklists/FE-REQ-042.md` | 2 |
| `salt-microFe/requirements/reports/checklists/FE-REQ-043.md` | 1 |
| `salt-server/requirements/reports/checklists/SRV-REQ-024.md` | 4 |
| `salt-server/requirements/reports/checklists/SRV-REQ-025.md` | 1 |
| `salt-server/requirements/reports/checklists/SRV-REQ-037.md` | 1 |
| `salt-server/requirements/reports/checklists/SRV-REQ-038.md` | 9 |

## 닫는 법

시나리오별로 결과를 이 문서 아래 "결과" 절에 적고, 원래 체크리스트의 해당 행에 결과를 덧붙인다(행을 지우지 않는다).
Q-6 은 표본 게이트가 열린 뒤에만.

## Changelog

- 2026-09-30: 초판 — 체크리스트 28개의 "로그인 QA" 를 모았다

---
id: SLICE-F011-7B-KR-JUDGMENT-EVIDENCE
title: "F011 슬라이스 7b — 국내 판단 근거 (FR-43 백테스트 표본 · 기저율 정정)"
priority: high
labels: [F011, slice, server, bff, fe]
created: 2026-10-26
---

## Summary

사용자 "판단 근거 올려야지 우린 — 그게 목적" · "5년 백테스트 + 라벨 분리"(2026-10-26).
국내 판단은 라이브 스냅샷 52 · 채점 0 이라 근거 · 적중률 · 실패사례가 없어 렌더되지 않았다(종목마다 30일에 1표본 — 피하기 20 은 몇 달).
같은 규칙을 서버 5년 일봉에 되돌려 채점한 **모의 성적**을 라이브 표본이 모자랄 동안만, 라벨을 붙여 싣는다. 라이브와 합산하지 않는다.
작업 중 판단 · 추천의 "기준 대비"(초과 적중률)가 후보 · 피하기에서 늘 0 이 되도록 세던 결함을 찾아 같이 고쳤다.

갭 손실 브랜치(`feat/f011-slice7-kr-coach-params`) 위에 쌓았다 — 상시 서버가 작업 트리를 돌려 둘 다 살아 있어야 했다.

| 영역 | REQ | 몫 |
|---|---|---|
| 서버 | `SRV-REQ-040` FR-43 · `SRV-REQ-024` FR-174 정정 · `DB-REQ-017`(DDL 없음) | 사전등록 · 백테스트 스크립트 · 출처 선택 · 기저율 풀 |
| BFF | `BFF-REQ-040` FR-21 · 주인 `BFF-REQ-024` | `sampleOrigin` 통과 |
| 프론트 | `FE-REQ-041` FR-25 · 주인 `FE-REQ-026` | 국내 상세 카드 · 모의 라벨 · 피하기 근거 수 |
| 짝(변경 없음) | 예측(`salt-forecast`) — 백테스트는 서버 규칙 코드로 돌린다 | — |

## 판단 — 리뷰가 볼 곳

1. **사전등록 → 정정 → 실행 순서** — 등록(`84ee294`) 직후 · 실행 전에 기저율 결함을 찾았다. 등록 문구 "같은 표본"을 풀로 읽었고 리포트에 적었다
2. **백테스트는 서버 스크립트** — 규칙(`scoreModeDecision`) · RSI(`calculateIndicators`)를 운영 코드 그대로 부른다. 예측(Python)에 다시 적으면 다른 규칙을 채점한다
3. **표시 규칙** — 국내만 · 라이브 ≥ 20 이면 라이브 · 아니면 백테스트(표본 ≥ 20 · 판단 달 ≥ 12) · 합산 없음 · 해설(LLM) · 성적표는 라이브만
4. **결과를 그대로** — 피하기 +3.3%p 중 +1.7%p 는 날짜 효과(플라시보 귀무 평균). 최악 −86.9% 는 실제 연속 하한가

## 검증 · 미검증

`requirements/reports/checklists/F011-slice7b-kr-judgment-evidence.md` · 회고 `requirements/reports/retrospects/F011-slice7b-kr-judgment-evidence.md` ·
리포트 `salt-server/requirements/reports/backtests/kr-judgment-backtest-2026-10-26.md`.

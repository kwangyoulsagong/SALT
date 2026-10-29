---
id: SLICE-F009-10-HIDE-PURCHASE-PRICE
title: "F009 슬라이스 10 — 매입가 숨김 화면 (FR-27)"
priority: medium
labels: [F009, slice, fe]
created: 2026-10-29
---

## Summary

`FEATURE-009` FR-27(Should) — 매입가 숨김 토글. 서버 저장(S1)과 BFF 통과(S3)는 2026-09-24 에 끝났고, 화면만 "웹에 평단을
보이는 화면이 없다"로 보류돼 있었다. 2026-10-29 전수 조사에서 그 사유가 낡은 것을 찾았다 — 홈 보유 요약이 손익률을 그린다
(사용자 "새브랜치 파고 다음꺼 진행").

| 무엇 | 어디 | 왜 |
|---|---|---|
| 토글 | 코치 리포트 리스크 예산 패널 아래(`features/toggle-purchase-price`) | 포지션 화면이 웹에 없다 — 게이지와 같은 패널(FR-23 · 24 와 같은 이유). 홈은 읽기 전용(`fsd-widgets.md`) |
| 숨김 | 홈 보유 요약 손익률 칸(`entities/portfolio`) | 웹에서 손익률을 보이는 유일한 자리. 평가금액 · 합계는 남는다 |
| 한 줄 | 숨김이면 목록 아래 "오늘 처음 본다면, 지금 값으로 이만큼 담을까요?" | FR-27 원문. 물음 — 지시가 아니다 |

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| 프론트 | `salt-microFe/requirements/specs/in-progress/FE-REQ-039-F009-TRADE-RISK.md` FR-13 | 토글 · 홈 숨김 |
| 프론트(주인) | `salt-microFe/requirements/specs/in-progress/FE-REQ-010-F000-UI.md` FR-5 | 보유 요약 `showProfitRate` — Changelog |
| BFF | `bff/requirements/specs/done/BFF-REQ-038-F009-TRADE-RISK.md` | **변경 없음** — 프로필 통과 그대로 |
| 서버 | `salt-server/requirements/specs/done/SRV-REQ-038-F009-RISK.md` | **변경 없음** — 저장 · 검증 그대로 |

판단:

- **설정이 오기 전에는 손익률을 그리지 않는다.** 켠 사람에게 한 번 보였다 사라지면 숨김이 아니다. 못 불러오면 서버 기본(보임)
- 낙관적 갱신 — 금액이 아닌 표시 설정이라 허용(`fsd-features.md`). 실패하면 되돌린다
- 저장 중 `disabled` 대신 입력 무시 + `aria-busy` — `disabled` 는 키보드 포커스를 뺀다(확인 중 발견)
- 프로필 조회는 홈 서버 컴포넌트 블록을 그대로 두고 위젯 안 클라이언트 잎(`InvestmentsSummaryLeaf`)에서 — 두 엔티티를 잇는 일이라 위젯

하지 않는 것:

- 평단 · 손익금 숨김 — 웹에 그 화면이 없다. 포지션 화면이 생기면 같은 설정(`useCoachProfile`)을 읽는다
- 미러 · 복기 · 청산 결과의 손익 — 본인 거래 기록이라 FR-27 대상이 아니다(FR-33 결정과 같은 선)

## 계약

- 없음. `GET · PATCH /api/app/ai-coach/profile` 기존 경로를 웹이 처음 쓴다. `@repo/core` `CoachProfileSettings`(필드 하나) 추가
- DDL · 마이그레이션 · env 없음

## 커밋

- `5d9e011` feat(fe) — 토글 · 조회 훅 · 홈 숨김 · 레지스트리

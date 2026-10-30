---
id: SLICE-F008-24-KR-MARKET-EVENTS
title: "F008 슬라이스 24 — 국내 증시 일정 · 실적 공시 (FR-69 · 70 · 71)"
priority: high
labels: [F008, F011, slice, forecast, db, server, bff, fe]
created: 2026-10-30
---

## Summary

국내 주식(F011)을 보는데 앞으로 무슨 일정이 있는지가 화면에 없다. "주요 사건"은 미국 거시 일정 셋 × BTC 뿐이다.
이 슬라이스는 같은 장치(일정 → 선반영도 → 워크포워드 반응 분포 → 3종 게이트)에 **국내 시장 일정 4종**과
**종목 실적 공시**를 얹는다. 새 통계 방법 · 새 화면 컴포넌트를 만들지 않는다.

| 단계 | 내용 | 시작 조건 |
|---|---|---|
| 1 | 금통위 · 국내 물가 · 수출입 · 선물옵션 동시만기 — 일정 · 국내 종목 반응 · 국내 상세 카드 · 국내 탭 일정 띠 | 없음 |
| 2 | 종목 실적 공시(잠정실적 · IR 일정) · 과거 공시일 기준 예상 창 | DART 공시 수집 허용(`FC-REQ-021` Q1) |

| 영역 | REQ | 몫 |
|---|---|---|
| 예측 | `salt-forecast/requirements/specs/to-do/FC-REQ-021-F008-KR-MARKET-EVENTS.md` | 일정 수집 · 규칙 계산 · 반응 · 통계 · 예상 창 |
| DB | `salt-server/requirements/specs/to-do/DB-REQ-034-F008-KR-MARKET-EVENTS.md` | 종류 확장 · `symbol` 열 · PK 교체 · 예상 창 테이블 |
| 서버 | `salt-server/requirements/specs/to-do/SRV-REQ-041-F008-KR-MARKET-EVENTS.md` | 국내 종목 읽기 · 범위/지역 · 다가오는 일정 경로 |
| BFF | `bff/requirements/specs/to-do/BFF-REQ-043-F008-KR-MARKET-EVENTS.md` | 중계 |
| 프론트 | `salt-microFe/requirements/specs/to-do/FE-REQ-046-F008-KR-MARKET-EVENTS.md` | 국내 상세 카드 · 국내 탭 일정 띠 |
| 주인 REQ(구현 때 Changelog) | `FC-REQ-005` · `DB-REQ-029` · `SRV-REQ-037` · `BFF-REQ-037` · `FE-REQ-038` · `FE-REQ-041` · `FEATURE-006` FR-65 | 같은 함수 · 테이블 · 카드를 넓힌다 |

## 판단 — 리뷰가 볼 곳

1. **"왜 움직였나"가 아니라 "이 일정 뒤 과거엔 이만큼 움직였다"** — 뉴스로 사후 원인을 붙이는 방식은 들이지 않는다
   (`2026-09-23-catalyst-detection.md` §0-1). 같은 이유로 실시간 이슈 순위 · 어닝콜 번역도 들이지 않았다(FEATURE-008 2026-10-30 이력)
2. **일정은 공개 사실, 분포는 전망** — 다가오는 일정 띠는 모든 로그인 사용자, 반응 분포 카드는 소유자 전용(`ADR-003`)
3. **실적일은 한 날짜로 찍지 않는다** — 국내 기업 다수가 실적 발표일을 미리 알리지 않는다. 확정(IR 공시)이 없으면
   과거 공시일 분포로 "예상 창"만, "확정 아님" 라벨
4. **PK 교체** — 종목 사건은 같은 시각 여러 종목이라 `(kind, event_at)` 로는 덮어쓴다. 1단계 마이그레이션은 되돌릴 수 있다
5. **LLM 일정 요약은 넣지 않는다** — 분포 숫자 위에 문장이 더할 정보가 적고, 생성형 결과물 표시(AI 기본법 제31조) 화면
   규칙이 먼저다(FEATURE-008 FR-72)

## 검증 · 미검증

구현 전(to-do). 착수 시 `in-progress/` 로 옮기고 체크리스트 · 회고를 만든다.

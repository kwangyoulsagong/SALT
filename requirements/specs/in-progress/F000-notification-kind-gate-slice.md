---
id: SLICE-F000-NOTIFICATION-KIND-GATE
title: "F000 슬라이스 — 알림 1종 · 코드만 · 금액 없음 (notification 컨텍스트)"
priority: medium
labels: [F000, F006, slice, server, bff, notification]
created: 2026-10-28
---

## Summary

F000 마지막 묶음 "알림 1종"(`FEATURE-000` FR-11)을 닫는다. 동면 410(`F000-dormant-410`) 다음 순서다.

알림을 만드는 곳은 코치 판단 변화 하나뿐이었다. 그런데 코치 어댑터가 테이블에 직접 `decision_change` 종류와
완성 문장("BTC 단타 판단이 … 바뀌었습니다")을 썼다. 종류 · 문구 · 금액 규칙을 걸 자리가 없었다.
`notification` 컨텍스트(레지스트리에 이미 있던 이름)를 세우고 만드는 길을 공개 API 하나로 모았다.

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `SRV-REQ-008` | FR-20~22 · 24 · 25 | 1종 · `kindGate` · 생성 0 확인 · 금액 없음 · 코드만 |
| `SRV-REQ-009` | FR-12 · 13 | 생성 거부 422(공개 API) · 응답 금액 0 |
| `SRV-REQ-007` | FR-11 | 이관(`modules/investment-notification` 삭제) |
| `BFF-REQ-007` | C절 FR-20~24 | 뷰모델 — 1종 필터 · 금액 제거 · 코드만 · 정렬 · 20건 |
| `BFF-REQ-008` | FR-1~3 | `AlertVM` 계약(`symbol` 추가 · `params` 문자열만) |
| F006 앞당김 | `SRV-REQ-028` FR-90 첫 원인 · FR-94 · `DB-REQ-022` FR-81~83 | 같은 쿼리라 함께 |

## 판단 — 리뷰가 볼 곳

1. **이벤트가 아니라 공개 API 호출** — 관문이 거부(422)하면 만드는 쪽이 알아야 한다. 이벤트로 내면 거부가 사라진다
2. **금액 금지 = 인자를 문자열로만 + 숫자처럼 생긴 문자열 거부 + 금액 이름 키 거부.** 키 이름만 보면 `note: "158000000"` 이 지나간다. BFF 가 같은 기준으로 한 번 더 거른다(잠금 화면은 한 겹으로 부족)
3. **FR-21 "옛 행 읽기 허용"을 "지우지 않는다"로 읽었다** — 목록 · 안 읽은 수 · 읽음은 1종만(F006 FR-94 · DB-REQ-022 FR-83). `SRV-REQ-008` "구현이 REQ와 다른 지점"
4. **스키마: `messageCode` 칸 추가 · `title`/`message` nullable** — 코드를 `title` 에 넣는 꼼수 대신. 되돌리기 SQL 은 migration 머리에
5. **목록 항목 모양 변경(BREAKING)** — 소비처는 BFF `/api/app/alerts` 하나고 같은 PR 이다. 프론트 소비처 0건

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 알림 화면 · `messageCode` i18n 문장 | 프론트 소비처가 아직 없다 | F006 `FE-REQ-030` · `FE-REQ-011` FR-44 |
| `alertsEnabled` · `dedupeKey` · 딥링크 `target` · 밴드 원인 | F006 본편 | `SRV-REQ-028` FR-90~93 |
| 화면 디자인 전체 깨짐(사용자 2026-10-28 보고) | 이 슬라이스와 무관 · 사용자 "나중에" | 별도 작업 |

---
id: SRV-REQ-025
spec: ../../specs/in-progress/SRV-REQ-025-F004-API.md
checklist: ../checklists/SRV-REQ-025.md
title: F004 AI 코치 추천 — REST 계약 회고 (종목 경로)
status: 부분 완료
written: 2026-09-22 (backfill)
---

흐름 전체는 루트 회고 `requirements/reports/retrospects/F004-symbol-judgment.md` · `F004-zone-gauge.md`.

## 1. 무엇을 했나

`GET /api/ai-coach?symbol` 응답에 `modes.{scalp,longTerm}`(판단 · `validity` · 게이트 · `trackRecord` ·
`failureCases` · `zone`) · `gaugeTrackRecords` · `disclaimer` 를 더하고 `confidence` 를 뺐다. 새 엔드포인트는 없다.
체크리스트 집계 pass 9 · 미충족 1(FR-48) · 범위 밖 1(FR-49) · 미착수 27.

## 2. 잘 된 것

- **BREAKING 을 한 커밋에 가뒀다.** `confidence` 제거는 `1b8abd4`(`feat(srv)!`) 하나에 있고 커밋 본문이 소비처
  영향(BFF `mapDecision` 은 `undefined` 를 옮기고 프론트는 grep 0건)을 적었다.
- **하위 호환 필드를 남겼다.** `modeDecision` · `dualDecision` 은 그대로 두고 `confidence` 만 뺐다(FR-41).
- **표본 0 과 `null` 을 구분했다**(FR-43). `winRate: null` · `sample: 0` 이라 화면이 "표본이 쌓이는 중"과
  "0%"를 헷갈리지 않는다.
- `failureCases` 항목을 문구가 아니라 코드와 숫자(`event` = `<mode>.<action>`, `returnRate`)로 줬다 — 문구는 프론트
  i18n 이다(REQ Changelog).

## 3. 틀렸던 것

기록된 것 없음 — 두 슬라이스에서 이 REQ 몫의 계약을 되돌린 커밋은 없다.

다만 explain **요청** 스키마에서 필수 `confidence` 가 함께 빠졌다(`coach.dto.ts`, `1b8abd4`). FR-30 이 적은 예외는
"종목 경로의 `confidence`" 하나뿐이다. `z.object` 가 모르는 키를 버려서 보내던 쪽은 깨지지 않지만, 예외 목록에는 없다.

> **Action:** FR-30 예외 문장에 explain 요청의 `confidence` 제거(D3 · FR-102)를 한 줄 더한다.

## 4. 남은 기술부채

| 항목 | 근거 |
|---|---|
| FR-48 `defaultMode` — 컬럼이 없어 `query.mode ?? "scalp"` 그대로 | `DB-REQ-017` FR-20 미착수 |
| BFF 가 새 필드를 전달하지 않고 `confidence: undefined` 를 옮긴다 | `BFF-REQ-023~025` |
| 응답에 `assetType` 없음 | `SymbolCoachResult` 계약에는 있다 |
| FR-31 계약 테스트 없음 | 유닛 · 유스케이스 테스트만 |

## 5. 다음에 보완할 규칙 · 문서

- 서버 응답 필드를 더한 슬라이스가 BFF 보다 먼저 머지됐다. 그동안 새 필드는 BFF 에서 떨어진다 — 이것을
  "미검증 · 범위 밖"에 적은 것(두 루트 체크리스트 §4)은 맞았다. 서버 → BFF 순서로 나눌 때는 **BFF 슬라이스 REQ 번호를
  서버 REQ Changelog 에 같이 적는다**(지금은 체크리스트에만 있다).

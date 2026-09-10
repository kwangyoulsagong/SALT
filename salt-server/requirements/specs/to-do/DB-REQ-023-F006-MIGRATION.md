---
id: DB-REQ-023
feature: F006
area: db
kind: MIGRATION
title: "F006 코치 대화 & 3탭 IA — 마이그레이션 정의"
priority: high
labels: [db, migration, conversation, fx-kind]
created: 2026-09-09
---

## Summary

F006의 마이그레이션은 **신규 테이블 3개 + `FxRate.kind` 확장**이다. 기존 데이터를 건드리지 않으므로 위험이 낮다.

## 마이그레이션 순서

| 단계 | 이름 | 내용 | 롤백 |
|---|---|---|---|
| M1 | `20260909_coach_conversation` | `CoachConversation` 신설 + `User` 역참조 | 테이블 drop |
| M2 | `20260909_coach_message` | `CoachMessage` 신설 + FK 3개 | 테이블 drop |
| M3 | `20260909_panel_layout` | `PanelLayout` 신설 | 테이블 drop |
| M4 | `20260909_fx_kind_current` | `FxRate`에 `kind = 'current'` 행이 들어갈 수 있게 (스키마 변경 없음, **시드/워커 변경**) | 해당 없음 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | M1~M3은 **신규 테이블만** 만든다. 한 릴리스에 배포 가능 | Must |
| FR-2 | M2는 M1 이후여야 한다(FK) | Must |
| FR-3 | `CoachMessage.insightId` FK는 `onDelete: SetNull`이다. insight 정리가 대화를 지우지 않는다 | Must |
| FR-4 | **M4는 스키마 변경이 아니다.** `FxRate.kind`가 이미 문자열 컬럼이므로 새 값이 들어갈 수 있다. `fx-rate.worker`가 `current`를 수집하게 바꾸는 것이 실제 작업이다 | Must |
| FR-5 | drop이 없으므로 `pg_dump`는 필수가 아니다 | Must |

## `FxRate.kind = 'current'` 추가

총자산은 **현재 환율**로 환산하고, 세금은 **결제일 기준환율**을 쓴다. 두 값이 다르다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `fx-rate.worker`가 `kind: 'settlement_base'`와 **`kind: 'current'` 둘 다** 수집한다 | Must |
| FR-11 | `current`는 **더 자주** 수집한다(예: 1시간마다). 총자산 표시에 쓰인다 | Must |
| FR-12 | `@@unique([base, quote, rateDate, kind])`가 이미 있으므로 **같은 날짜에 두 kind가 공존**한다 | Must |
| FR-13 | `current`가 하루에 여러 번 갱신되면 `rateDate`가 같아 upsert로 덮인다. **최신값만 남는 것이 의도**다 | Must |
| FR-14 | 총자산 조회는 `kind = 'current'`의 최신 행을 읽는다 | Must |
| FR-15 | `current`가 없으면 **`settlement_base`로 폴백하지 않는다.** `degraded`로 표시한다 — 기준이 다른 값을 섞으면 사용자가 오해한다 | Must |

## 대화 보존 정책

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `archivedAt`으로 아카이브한다. **삭제하지 않는다** | Should |
| FR-21 | 아카이브 기준을 정한다: 마지막 메시지로부터 **90일** 또는 사용자당 최근 **50개 대화** | Should |
| FR-22 | 아카이브는 배치로 나눠 UPDATE한다 | Should |
| FR-23 | 아카이브된 대화는 목록에서 제외하되 **조회는 가능**하게 한다 | Should |
| FR-24 | 실제 삭제는 사용자 요청 시에만. 자동 삭제 0건 | Must |

## 시드 — 추천 질문 Chip

F006 FR-22: 추천 질문 4개("지금 팔아야 하나?" · "이번 주 얼마 넣을까?" · "세금 언제까지?" · "내가 뭘 잘못했나?")

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 추천 질문을 **DB에 두지 않는다.** 프론트 `shared/i18n`의 문구다 | Must |
| FR-31 | 이유: 질문 문구는 **UI 문구**이고 사용자별로 다르지 않다. DB에 두면 i18n 정책(금지 표현 검사)을 벗어난다 | Must |

## 되돌리기

| 단계 | 롤백 |
|---|---|
| M1~M3 | 테이블 drop. 대화 데이터가 손실된다 — **사용자에게 알려야 한다** |
| M4 | `fx-rate.worker`를 되돌린다. `current` 행은 남아도 무해하다 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | M1~M3 롤백은 **대화 데이터를 잃는다.** 배포 후 되돌리려면 `pg_dump`가 필요하다 | Must |
| FR-41 | 대화 기능을 끄는 것과 테이블을 drop하는 것을 구분한다. **끄기는 route 해제로** 충분하다 | Must |

## Acceptance Criteria

- [ ] M1~M4가 각각 독립 마이그레이션(또는 워커 변경)이다
- [ ] M2가 M1 이후이고 FK가 정상 생성된다
- [ ] `CoachMessage.insightId`가 `onDelete: SetNull`이다
- [ ] `fx-rate.worker`가 `settlement_base`와 `current` 둘 다 수집한다
- [ ] `current`가 1시간마다 갱신된다
- [ ] 같은 날짜에 두 `kind`가 공존한다
- [ ] 총자산 조회가 `kind = 'current'`를 읽는다
- [ ] **`current`가 없으면 `settlement_base`로 폴백하지 않고 `degraded`다**
- [ ] 대화 아카이브 기준이 문서화되어 있다
- [ ] 자동 삭제가 0건이다
- [ ] 추천 질문이 DB에 0건이다 (프론트 i18n)
- [ ] `prisma migrate status` clean + `npm run build` 통과

## Dependencies

- **선행:** `DB-REQ-021`(스키마) · `DB-REQ-005`(`FxRate`)
- **구현:** `SRV-REQ-030`(F006 DATA — 워커)

## Open Questions

- `current` 수집 주기 1시간이 적절한가. **총자산이 홈 첫 블록**이므로 더 자주 필요할 수 있다. 다만 환율 소스의 호출 한도가 제약이다.
- 대화 아카이브 기준(90일 vs 50개). 사용자 ≤10명이면 데이터가 크지 않으므로 **아카이브를 미룰 수도** 있다.
- 대화 테이블 drop 시 데이터 손실을 어떻게 알릴지. 배포 전 백업이 실질적 답이다.

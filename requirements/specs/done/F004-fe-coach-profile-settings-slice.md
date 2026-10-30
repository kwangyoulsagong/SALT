---
id: SLICE-F004-FE-COACH-PROFILE-SETTINGS
title: "F004 슬라이스 18 — 설정 화면 /settings · 코치 설정 (FE)"
priority: high
labels: [F004, slice, fe, coach, settings]
created: 2026-10-30
---

## Summary

**F004 FR-12 성향 설정 화면.** 서버 프로필 영속화(`SRV-REQ-025` FR-13) · BFF `GET/PATCH /api/app/ai-coach/profile` 은 9월부터
있었고, 헤더 프로필 메뉴의 "설정 (준비 중)"이 이 화면을 기다리며 비활성이었다. 사용자 "새브랜치 파고 다음꺼 진행" — 마스터
인덱스 §4-1 순위 2 "F004 부분 FR" 의 FR-12.

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `FE-REQ-026` | FR-80(개정) · 81 · 82 | `/settings` — 기본 모드 · 매도 돌아보는 기간 · 내 기준 링크 · 매입가 숨김 |
| `FE-REQ-027` | FR-62(다르게) | 저장 뒤 `router.refresh()` 대신 쿼리 무효화 |
| `FE-REQ-028` | FR-50 · 51 · 52(개정) | PATCH · 재시도 0 · `notificationLevel` 제외 · `symbolAll` 키 |
| `FE-REQ-039` | FR-13(코드만) | 토글 저장이 설정 전체를 읽는다 — 캐시를 숨김 한 필드로 덮지 않게 |
| `FE-REQ-010` · `013` · `030` | 파일 · 상태 | 경로 상수 · `ssr:false` 화면 목록 · FR-120 ③ 코치 그룹 먼저 |
| `BFF-REQ-024` · `SRV-REQ-025` · `DB-REQ-017` | — | **변경 없음.** 이미 6필드를 준다 |

## 판단 — 리뷰가 볼 곳

1. **서버가 읽지 않는 설정은 칸을 두지 않는다(사용자 결정).** 6항목 중 `riskTolerance` · `rebalanceBand` · `notificationLevel` 은
   저장만 되고 서버 안 소비처가 0건이었다(grep). 바꿔도 아무것도 달라지지 않는 칸은 화면이 사실과 다른 말을 하게 된다.
   서버가 쓰게 되면 그때 연다 — `@repo/core` 타입에도 싣지 않았다
2. **한 종목 상한은 옮기지 않고 링크한다.** 코치 리포트 "내 기준"(`set-risk-budget`)이 게이지와 나란히 이미 받는다 —
   같은 값을 두 곳에서 고치게 하지 않는다. 매입가 숨김은 같은 기능을 두 자리에 놓았다(같은 캐시)
3. **칸마다 무엇이 달라지는지 한 줄.** 기본 모드 = 종목 화면 첫 관점(주소 `?mode=` 가 이긴다) · 매도 기간 = 리포트
   "최근 행동" 매도 줄. "공포 매도" 같은 서버 이름을 화면에 쓰지 않는다(공통 수용 기준 — 인격 평가 0)
4. **낙관적 갱신 없음 · 바꾼 칸만 PATCH.** 판단 · 리포트가 이 값으로 다시 계산된다. 저장 뒤 `symbolAll` · `report` 무효화
5. **응답 매퍼 하나.** 조회 · 설정 저장 · 토글 저장이 같은 캐시 키에 쓰므로 `toCoachProfileSettings` 하나를 쓴다.
   모르는 값은 `null` → 그 칸만 "불러오지 못했어요"(기본값을 지어내지 않는다)

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `riskTolerance` · `rebalanceBand` · `notificationLevel` 칸 | 서버 소비처 0건 — 사용자 결정 | 서버가 점수 · 리밸런싱 · 알림 빈도에 쓰게 될 때(`SRV-REQ-025`) |
| RN 설정 화면 | 앱 미착수 | `RN-REQ-020` FR-70 |
| 공용 스타일 대비 3건(패널 설명 · 세그먼트 미선택 글자 · 토글 설명) | 기존 공용 — 새 화면에서 일괄 치환하지 않는다 | `@repo/ui` 대비 정리 REQ(F009 남은 것) |
| 설정 화면의 다른 그룹(적립 · 알림 · 거래 목록) | 각 기능 미착수 | `FE-REQ-030` FR-120 |

검증은 `requirements/reports/checklists/F004-fe-coach-profile-settings.md`, 회고는 `requirements/reports/retrospects/F004-fe-coach-profile-settings.md`.

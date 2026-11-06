---
id: SLICE-MONEY-S3A-IDENTITY-SHELL
title: "돈 관리 앱 S3a — identity 서비스 첫 판(Kotlin) · 도메인 선택 온보딩 · 홈 카드 순서 · 숨김"
priority: high
labels: [F015, server, db, bff, frontend, slice, msa]
created: 2026-11-06
status: done
---

## Summary

사용자 "새브랜치 파고 다음 파이프라인 진행" — 마스터 인덱스 §4-1 3a 다음 칸 **서버 S3**(identity). S3 몫이 넓어(셸 화면 기능 · 사용자 표 이동 ·
토큰 발급자 교체 · 내보내기 · 삭제 · 분류 · 계측) 셋으로 나눴다 — 이 슬라이스는 **S3a: 사용자가 바로 보는 셸 기능 둘**. 한 줄 — "고른 것만 묻고, 고른 것만 홈에 보인다".

> **done 2026-11-06** — 커밋 `fc0207cb`(Kotlin identity) · `7f2ba1ed`(옛 3스텝 은퇴 — revert 지점) · `066ba971`(BFF) · `c1baa77a`(FE).
> 영역 REQ 넷 in-progress(남은 FR 은 S3b · S3c). 검증 `requirements/reports/checklists/MONEY-S3a-identity-shell.md`.

## 범위

| REQ | 이번 몫(S3a) | 남는 몫 |
|---|---|---|
| `SRV-REQ-048` | FR-1 도메인 선택 온보딩 · FR-2 홈 카드 순서 · 숨김 · 수용 기준 1 "투자 미선택 → 투자 질문 0" | FR-8 JWKS · FR-9 `UserRegistered`(S3b) · FR-3 · 4 · 6 · 7(S3c) |
| `DB-REQ-040` | FR-2 `user_domain_pref` · FR-1 정정(옛 3스텝 상태 보존 불필요) | FR-1 이동 · FR-5 서명 키(S3b) · FR-4 · 6(S3c) |
| `BFF-REQ-046` | FR-4 투자 미선택 숨김(서버 기본값) · FR-5 `PUT /home/layout` · FR-6 온보딩 셋 · 옛 `/status` 410 | FR-7 내보내기 · 삭제(S3c) |
| `FE-REQ-055` | FR-2 편집(설정 패널) · FR-4 온보딩 · 고침 — 설정 패널이 저장 중 클릭을 버리던 것(알림 패널 포함) | FR-5 내 데이터 · FR-7 개인정보(S3c) |
| 짝 | 은퇴: Express `onboarding`(`SRV-REQ-008` FR-13 · 14 · `009`) · 저축 `/goals/exists`(`SRV-REQ-045`) · `PLATFORM_API_URL`(`SRV-REQ-040` 파일) · BFF 옛 계약(`BFF-REQ-007` · `008`). 라우팅 `/identity`(`BFF-REQ-045`) · `svc_identity`(`DB-REQ-036`) · 플랫폼 설정(`SRV-REQ-043`) · 슬라이스 레지스트리(`FE-REQ-009`) · 온보딩 화면(`FE-REQ-010` · `044`) · `run-platform.sh`(`OPS-002`) | — |

## 판단 — 리뷰가 볼 곳

1. **S3 를 셋으로 — 사용자 표보다 셸 설정이 먼저.** identity 가 첫 표 `user_domain_pref` 하나로 태어나고(`user_id` 는 FK 없는 열 — `DB-REQ-036` 부록 B1),
   `users` · 초대 코드 이동과 토큰 발급자 교체(JWKS · 이중 검증)는 S3b. 둘을 한 PR 에 두면 "화면이 바뀌었다"와 "로그인 경로가 바뀌었다"가 섞여 되돌리기가 하나가 안 된다
2. **옛 3스텝은 은퇴(`msa-services.md` §7)** — Express 조합 컨텍스트가 남의 사실(보유 거래 수 · 저축 목표 존재 — 후자는 플랫폼 내부 REST)을 읽어 단계를 추측했다.
   소비처(BFF 하나 → 웹 하나)가 같은 PR 에서 옮겨 가 Kotlin 으로 다시 만들지 않았다. 그 프로브만 쓰던 저축 `/goals/exists` · Express `PLATFORM_API_URL` 도 같이 지웠다
3. **"끝"은 사용자가 정한다** — 첫 기록 화면은 다른 zone 이라 서버가 "첫 기록을 했나"를 알려면 서비스 간 호출이 다시 생긴다. 첫 기록 버튼을 누를 때(또는 나중에 하기) 끝을 기록하고 그 화면으로 문서 이동
4. **기본 배치도 서버가** — 저장 전이면 "고를 수 있었는데 안 고른 도메인 숨김"(`BFF-REQ-046` FR-4 "투자 미선택이면 숨김"을 셋으로 넓힘). 아직 안 고른 기존 사용자는 숨김 0 — 지금까지의 홈 그대로
5. **편집은 홈이 아니라 `/settings`** — 홈 위젯은 읽기 전용(`fsd-widgets.md`) 그대로. 순서 · 숨김 패널은 알림 패널 옆
6. **같은 원인 둘을 규칙으로** — 설정 패널이 저장 중(`isPending`) 누른 것을 버렸다(새 패널이 S2c 알림 패널의 가드를 본떴다). 같은 묶음 쓰기는 `scope` 로 차례로, 마지막 저장만 서버 값으로

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 사용자 · 초대 코드 표 이동 · JWKS · `UserRegistered` | 토큰 발급자 교체 단계 — 이 슬라이스와 되돌리기 단위가 다르다 | 서버 S3b(`SRV-REQ-048` FR-8 · 9 · `DB-REQ-040` FR-1 · 5) |
| 내 데이터 내보내기 · 계정 삭제 · 민감 정보 분류 · 도메인 사용 계측 | 서비스마다 export · 삭제 구독이 필요 — 별도 칸 | 서버 S3c(`SRV-REQ-048` FR-3 · 4 · 6 · 7) |
| 팁 카드 | 카드 원천(content 홈 카드)이 없다 — 배치 순서 자리는 이미 있다 | `SRV-REQ-047` 홈 카드 |
| 앱(RN) 온보딩 | 앱 미착수 | `RN-REQ-035` |
| 공용 패널 설명글 대비(회색 500 · 3.03:1) | 기존 패널 둘의 기존 결정 — 새 패널만 2단 글자색 | 디자인 대비 정리 때(`FE-REQ-047` FR-13) |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-06 | 신규 · done — identity 셸 설정 · 도메인 선택 온보딩 · 홈 카드 배치 · 옛 3스텝 은퇴 |

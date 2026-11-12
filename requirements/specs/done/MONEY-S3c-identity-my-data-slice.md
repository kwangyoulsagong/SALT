---
id: SLICE-MONEY-S3C-IDENTITY-MY-DATA
title: "돈 관리 앱 S3c — 내 데이터 내보내기 · 계정 삭제(지우기 허가 · 서비스마다 · 계정 마지막)"
priority: high
labels: [F015, server, db, bff, frontend, slice, msa, security, privacy]
created: 2026-11-12
status: done
---

## Summary

사용자 "새브랜치 파고 다음 파이프라인 진행" — S3b 머지(#177) 뒤 마스터 인덱스 §4-1 3a 다음 칸 **서버 S3c**. 브랜치 `feat/srv-req-048-s3c-identity-export-delete`.
한 줄 — **내 기록을 한 파일로 받고, 계정을 지우면 모든 서비스에서 그 사람 행이 0 이 된다.**

S3c 를 둘로 나눴다: 내보내기 · 삭제(이 슬라이스) / 민감 정보 분류 · 사용 계측(S3d). 둘은 서로를 막지 않고, 판단이 섞이면 리뷰가 어렵다.

## 범위

| REQ | 이번 몫 | 남는 몫 |
|---|---|---|
| `SRV-REQ-048` | FR-3 내보내기 · FR-4 계정 삭제(정정 둘 — 저장 0 · 이벤트 대신 BFF 순서 + 지우기 허가) · Open Question 닫음 | FR-6 · 7(S3d) · HS 삭제(11-27) |
| `DB-REQ-040` | FR-4 `account_deletion_log`(identity V3) · 내보내기 요청 표 정정(만들지 않음) | FR-6(S3d) |
| `BFF-REQ-046` | FR-7 `GET /api/app/me/export` · `DELETE /api/app/me` | — |
| `FE-REQ-055` | FR-5 `features/export-my-data` · `features/delete-account` | FR-7(S3d) |
| `FEATURE-015` | FR-3 | FR-5 · 6(S3d) |
| 짝 | `DB-REQ-037` · `DB-REQ-038`(원장 지우기 예외) · `SRV-REQ-045` · `046` · `047`(조립에 목록) · `BFF-REQ-045`(라우팅 셋) · `DB-REQ-017`(`app.ts`) · `FE-REQ-009`(레지스트리) · `FE-REQ-053`(`/settings`) | — |

## 판단 — 리뷰가 볼 곳

1. **스키마의 모든 표는 "사람 행" 이거나 "개인 데이터 아님(이유)" 이다** — 플랫폼 `support/persistence` `UserRows` 가 서비스마다 목록을 받아 읽고 지운다.
   목록에 없는 표가 생기면 `MyDataEndToEndTest` 가 `information_schema` 로 깬다. Express 는 Prisma `dmmf` 로 `user_id` 모델 = 목록을 센다. 새 표를 만들 때 목록부터 — 안 그러면 지워지지 않는 개인 데이터가 조용히 생긴다
2. **접근 토큰 하나로는 아무것도 못 지운다** — identity 가 비밀번호를 다시 확인해 5분 허가(`aud` salt-erase, RS 만)를 주고, 지우는 경로는 접근 토큰 + 허가(`X-Salt-Erase`)가 **같은 사람**일 때만. 판정은 플랫폼 `EraseGrants` · Express `grantedUserId` 두 곳, 같은 경계 표
3. **이벤트가 아니라 BFF 가 순서** — 원래 `UserDeletionRequested` 이벤트였다. 행 수를 그 자리에서 모아 기록에 남기려면 응답이 필요하고, 서비스끼리 부르지 않는다(`msa-services.md` §5). 투자 → 가계부 → 저축 → 팁 → 코치 → ping → 알림 → **계정 마지막**. 중간에 멈추면 계정이 남아 "다시 누르기"가 복구다(지우기는 다시 불러도 안전)
4. **발행 원장(덧붙이기만) 둘도 지운다** — `projection_issued` · `landing_issued` 는 사람의 기록이라 계정 삭제에서 남기지 않는다. 트리거 예외는 `SET LOCAL salt.erase = 'on'` 을 켠 DELETE 하나(지우는 함수 한 곳만 켠다) — UPDATE 는 그때도 막는다. 판정 원장(`judgment_ledger`)에는 사람 칸이 없어 가명화 대상 0(Open Question 닫음)
5. **내보내기는 전부 아니면 실패 · 저장 0** — 조합 응답의 기본(`allSettled` 부분 성공)의 예외다. 일부만 담긴 파일을 "내 데이터 전부"로 내주면 거짓. 파일을 저장하지 않아 24시간 만료 · 요청 표가 필요 없다(정정)
6. **지운 계정의 갱신은 401** — 갱신이 서명만 봐서 지운 계정이 7일 동안 새 접근 토큰을 받을 수 있었다. 갱신이 계정 존재를 본다
7. **삭제 기록에 사람 칸 0** — 언제 · 서비스 → 표 → 행 수만. LLM 호출 기록은 사람 칸만 비운다(전체 하루 상한이 그 행 수로 맞는다)

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 민감 정보 분류 공개 · 사용 계측 | 이 슬라이스를 내보내기 · 삭제로 좁힘 | 서버 S3d(`SRV-REQ-048` FR-6 · 7 · `DB-REQ-040` FR-6 · `FE-REQ-055` FR-7) |
| 삭제 직후 남은 접근 토큰(최대 15분) | 접근 토큰은 서명만 본다. 지운 기기 쿠키는 그 자리에서 지우고 갱신은 401 — 남는 것은 다른 기기에서 이미 받은 접근 토큰뿐 | 토큰 폐기 목록이 필요해질 때(배포 `OPS-001`) |
| 앱(RN) 내 데이터 화면 | 앱 셸 미착수 | `RN-REQ-035` |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-12 | 신규 · 구현 · 로컬 운영 적용(identity V3 · 저축 V4 · 가계부 V9) · 실스택 · 실화면 · 변이 8/8 → done |
| 2026-11-12 | 확인 2회차 — 경로 충돌 0 · EXPLAIN · 로딩 · 실패 · 갱신 소비처 · axe(새 칸 대비 셋 고침). 공용 버튼 대비는 사용자 결정 |
| 2026-11-12 | 확인 3회차 — 지워지는 범위를 BFF 가 준다(체크리스트 §2-2) · main 나란히 · 운영 빌드 · 훅 사후 실행 |

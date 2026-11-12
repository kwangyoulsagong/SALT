---
id: SLICE-MONEY-S3B-IDENTITY-ACCOUNTS
title: "돈 관리 앱 S3b — 사용자 · 초대 코드 identity 이전 · RS256 발급 + JWKS · 이중 검증 · UserRegistered"
priority: high
labels: [F015, server, db, bff, slice, msa, security]
created: 2026-11-12
status: in-progress
---

## Summary

사용자 "새브랜치 파고 다음 파이프라인 진행" — F016 · F017 · F018 이 끝나 마스터 인덱스 §4-1 3a 다음 칸 **서버 S3b**(투자 작업과 번갈아).
한 줄 — **토큰 발급자를 Express 에서 Kotlin identity 로 바꾸고, 2주 동안 옛 토큰과 새 토큰을 둘 다 받는다.**

> **2026-11-12 마이그레이션 적용(사용자 "다해")** — `prisma migrate deploy` 둘: 사용자 FK 0 · 옛 표 셋 삭제 · 원장 행 그대로(거래 2 · 보유 2 · 봉 477만).
> 새 가입자(identity 에만 있는 계정)의 Express 쓰기(관심 201) 확인 · 임시 계정 양쪽 삭제. 남은 것은 옛 HS 삭제(2026-11-27) 하나.
>
> ~~**2026-11-12 구현 · 로컬 운영 적용(마이그레이션 제외)** — Kotlin 계정 · 토큰 · JWKS · Flyway V2 · 가져오기(사용자 5 · 코드 6 · 시도 6 대조 통과) ·
> Express 검증기 · BFF 라우팅 둘. **남은 것 하나: Prisma 마이그레이션 적용(FK 18 끊기 · 옛 표 셋 삭제) — 되돌리기 어려운 DB 작업이라 사용자 승인 대기.**
> 그 전에는 새로 가입한 계정이 Express 표(관심 · 인사이트 등)에 쓰지 못한다(FK) — 실스택에서 확인함, 임시 계정은 지웠다.
> 검증 `requirements/reports/checklists/MONEY-S3b-identity-accounts.md`.~~

## 범위

| REQ | 이번 몫(S3b) | 남는 몫 |
|---|---|---|
| `SRV-REQ-048` | FR-8 RS256 발급 · JWKS · 이중 검증 · 초대 시도 제한 · 감사 그대로 · FR-9 `UserRegistered` 발행 | HS 제거(2026-11-27) · FR-3 · 4 · 6 · 7(S3c) |
| `DB-REQ-040` | FR-1 `users` · `invite_codes` · `invite_code_attempts` 이동(Flyway V2 · 가져오기 · 대조) · FR-5 `signing_key` | FR-4 · 6(S3c) · 옛 표 drop 적용(승인 대기) |
| `DB-REQ-036` | 부록 B1 — Express 표 18개의 `users` FK 끊기(마이그레이션) · B5 코치 사용자 목록은 거래 · 계획 · 결과가 있는 사람(`users` 읽기 0) | B5 프로젝션(S6) |
| `BFF-REQ-045` | FR-5 이중 토큰 — 라우팅 `/auth` · `/users/profile` → platform(BFF 코드 무변경) | — |
| 짝 | Express `authMiddleware` · `marketReaderMiddleware`(`SRV-REQ-056`) · 워커(`SRV-REQ-053`) · 포트(`DB-REQ-033` · `DB-REQ-043` 머리 주인) · `app.ts`(`DB-REQ-017`) · 플랫폼 설정(`SRV-REQ-044`) · 이벤트 계약 `contracts/events/identity.UserRegistered.json` | — |

## 판단 — 리뷰가 볼 곳

1. **같은 키, 다른 `aud`** — 옛 HS 는 비밀 셋(접근 · 갱신 · 게스트 파생)으로 토큰 종류를 갈랐다. RS 는 키가 하나라 `aud`(salt-api · salt-refresh · salt-guest)로 가른다.
   불변식 "받는 쪽이 다른 토큰은 서로의 경로를 못 지난다"를 **Kotlin `DualTokenVerifier` · Express `TokenVerifier` 두 곳이 같은 경계 표**로 시험한다
2. **이중 기간 끝 = 설정 값 하나**(`AUTH_LEGACY_HS_UNTIL` · `LEGACY_HS_UNTIL` = 2026-11-26T15:00Z, KST 11-27 0시). 옛 갱신 토큰 수명(7일)보다 길어 로그인한 사람이 다시 로그인하지 않는다.
   끝나면 서명이 맞아도 401 — HS 코드 · `JWT_SECRET` · `JWT_REFRESH_SECRET` 삭제는 그 뒤 커밋
3. **점유가 계정보다 먼저**(`JooqInviteCodes.redeem`) — 새 id 로 조건부 UPDATE → 0행이면 아무것도 안 쓰고 null. 경합을 예외 · 롤백으로 가르지 않으려고 FK 를 `DEFERRABLE INITIALLY DEFERRED` 로
4. **Express 는 리소스 서버만** — 발급 · 비밀번호 · 초대 코드 코드를 지웠다(`auth` 컨텍스트 · `modules/user` · `jwt.ts` · `password.ts` · 발급 스크립트). JWKS 를 못 읽으면 401 이 아니라 503
5. **공개 경로는 `Authorization` 을 읽지 않는다**(플랫폼) — BFF 프록시가 로그인에도 `Bearer undefined` 를 싣는다. Express 는 무시했고 Spring 은 401 이었다(실스택에서 드러남). BFF 무변경이 합격 기준이라 플랫폼을 Express 처럼
6. **코치 배치 대상**(`users` 전체 → 거래 · 계획 · 결과가 있는 사람) — 세 배치(준수 판정 · 월간 복기 · 리밸런스)가 그 밖의 사람에게 쓰는 것이 0 이라 결과가 같다. 프로젝션은 S6(`DB-REQ-036` B5)
7. **구독자 0** — `UserRegistered` 는 발행만. 저축 · 가계부 · 팁은 첫 요청에 상태를 만들어 초기 상태가 필요 없다(FR-9 정정)

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~Prisma 마이그레이션 적용(로컬 운영 DB)~~ | **닫힘 2026-11-12** — 사용자 승인 뒤 적용(덤프 `~/Library/Application Support/SALT/backups/backup-identity-s3b-2026-11-12.dump`) | — |
| 옛 HS 코드 · 비밀 삭제 | 이중 기간 2주(FR-8) | 2026-11-27 |
| 내보내기 · 계정 삭제 · 분류 · 계측 | S3c | 서버 S3c(`SRV-REQ-048` FR-3 · 4 · 6 · 7) |
| 클라이언트 IP 요청 제한 | BFF 뒤라 키가 BFF 주소(옛것과 같은 처지) | 배포 `OPS-001`(X-Forwarded-For) |
| 프로필 PATCH 의 `profileImageUrl: null`(사진 지우기) | 소비처 0(화면 · BFF 호출 0) — null 은 "그대로" | 프로필 화면이 생길 때 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-12 | 신규 · 구현 · 로컬 운영 적용(마이그레이션 제외, 승인 대기) |
| 2026-11-12 | 마이그레이션 적용(사용자 승인) · 새 가입자 Express 쓰기 확인 · 임시 계정 삭제 |
| 2026-11-12 | 확인 2회차 — 변이 11/11 · 소유자 판정 · 국내 스트림 · 게스트 실화면 · identity 중단 중 검증, 새 결함 0 |

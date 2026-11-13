---
id: SLICE-MONEY-S3D-IDENTITY-CLASSIFY-USAGE
title: "돈 관리 앱 S3d — 개인 데이터 등급 · AI 로 가는 것 공개 · 도메인 사용 계측"
priority: high
labels: [F015, server, db, bff, frontend, ops, slice, msa, privacy]
created: 2026-11-13
status: done
---

## Summary

사용자 "새 브랜치 파고 다음 꺼 진행" — S3c 머지(#178) 뒤 마스터 인덱스 §4-1 3a 다음 칸 **서버 S3d**. 브랜치 `feat/srv-req-048-s3d-identity-classify-metrics`.
한 줄 — **무엇을 저장하는지 · AI 로 무엇이 가는지 설정 화면에서 본다. 도메인을 얼마나 쓰는지 금액 없이 센다.**

계측(FR-7)은 수집 경로가 없어 새로 깐다. 본인+친구용이라 숫자는 몇 명뿐이지만 같은 브랜치에서 둘 다 한다(사용자 2026-11-13).

## 범위

| REQ | 이번 몫 |
|---|---|
| `SRV-REQ-048` | FR-6 서비스마다 `GET /api/<service>/me/data-classification`(표 → 등급 · 설명) · Express 는 AI 입력 필드 목록을 같이 · FR-7 identity `POST /api/identity/me/usage` |
| `DB-REQ-040` | FR-6 등급 원천 = 표 주석 `"<등급>: <설명>"`(서비스마다 Flyway · Express Prisma 마이그레이션) · 새 FR-7 identity `usage_day` |
| `BFF-REQ-046` | 새 FR-10 `GET /api/app/me/privacy`(서비스 여섯 곳 등급 + AI 입력 → 뷰모델) · 새 FR-11 `POST /api/app/me/usage` 중계 |
| `FE-REQ-055` | FR-7 셸 `/settings` "저장하는 것 · AI 로 가는 것" 패널 · 새 FR-9 도메인 방문 · 홈 카드 클릭 계측 |
| `OPS-002` | 새 FR-8 `ops/salt.sh usage` — 주간 활성 · 재개율 · 카드 클릭 · 빠져 있던 `web-tips`(3005) |
| `FEATURE-015` | FR-5 · FR-6 |
| 짝 | `BFF-REQ-045`(라우팅 한 줄) · `DB-REQ-017`(`app.ts`) · `FE-REQ-009`(레지스트리) · `FE-REQ-013`(홈 카드) · `FE-REQ-035`(`apiFetch` 축) · `FE-REQ-067`(공용 내비) · `FE-REQ-053` · `056` · `057` · `058`(`ops/salt.sh` zone 줄) |

## 계획

- [x] [db] 플랫폼 서비스 여섯 · Express 사람 표에 등급 주석(record · financial · sensitive), 설명은 한국어. 기존 영어 주석 넷 다시 — `V*__data_classification.sql` · Prisma 마이그레이션
- [x] [module] `UserRows.classification()` · `unclassified()` — 내보내는 사람 표에 등급 없으면 `MyDataEndToEndTest` 가 깬다. Express 는 `personalRows.test.ts` 가 같은 판정
- [x] [api] 플랫폼 `MyDataController` · identity `MyAccountController` · Express `/api/investment/data-classification`
- [x] [module] AI 입력 필드 목록 `LLM_INPUT_FIELDS` — 해설 · 등락 한 줄 프롬프트가 쓰는 필드와 같아야 한다(감시 값 시험). `ExplainCaller.userId: null` 로 좁혀 사람 id 를 싣는 코드가 컴파일에서 깬다
- [x] [db] identity `usage_day(user_hash, on_day, shell_domain, kind, times)`(열 이름 · varchar 는 jOOQ 코드 생성 때문 — 회고) — 사용자 해시 = `sha256(user_id)` 를 SQL 한 곳에서. 금액 칸 0. 사람 행 목록에(계정 삭제 · 내보내기)
- [x] [api] identity `POST /api/identity/me/usage {domain, kind}` — 도메인 · 종류는 서버 허용 목록. 하루 한 행에 횟수 더하기(한 문장 upsert)
- [x] [bff] `GET /api/app/me/privacy` · `POST /api/app/me/usage`
- [x] [fe] `/settings` 패널(등급 문구는 키로) · zone 방문 · 홈 카드 클릭 보냄(실패해도 화면 영향 0)
- [x] [ops] `ops/salt.sh usage` + `ops/usage-weekly.sql`

## 판단 — 리뷰가 볼 곳

1. **등급 원천은 표 주석 하나** — 별도 분류 표를 두면 표를 만들 때 두 곳을 고쳐야 하고 갈라진다. 새 사람 표에 주석이 없으면 종단 시험이 깬다(S3c "목록에 없는 표" 와 같은 방식)
2. **AI 로 가는 사람 기록 0 을 타입으로** — LLM 을 부르는 곳은 Express 코치 배치 둘(해설 스냅샷 · 등락 한 줄)이고 입력은 시장 사실뿐. 공개 목록은 프롬프트가 실제로 쓰는 필드와 시험으로 묶는다
3. **사용자 해시는 SQL 한 곳** — 쓰기와 지우기가 같은 식을 쓴다. 비밀 값을 두지 않는다(같은 DB 에 사용자 표가 있어 비밀 값이 막는 것이 없다). 해시는 계측 쿼리가 사람 id 를 다루지 않게 하는 칸이다
4. **계측은 하루 · 도메인 · 종류당 한 행** — 시각 · 금액 · 화면 내용 0. 보내기 실패는 화면에 영향 0

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 결제 문자 원문 미보관(FEATURE-015 FR-5 첫 줄) | 결제 문자 입력 자체가 없다 | 결제 문자 입력이 생길 때 |
| 앱(RN) 설정 화면 | 앱 셸 미착수 | `RN-REQ-035` |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-13 | 신규(plan) — S3c 에서 되돌려 둔 시작분(등급 주석 · 분류 경로 일부 · `ExplainCaller.userId: null`) 되살림 |
| 2026-11-13 | 구현 · 로컬 운영 DB 적용 · 실스택 · 실화면 · 변이 9/9 → done. 실화면 결함 1(구분 기호) · FR 번호 겹침 정정(BFF FR-10 · 11 · FE FR-9) |

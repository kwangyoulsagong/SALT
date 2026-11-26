---
id: SLICE-MONEY-S4A-PORTFOLIO-PLAN
title: "서버 S4a — 밴드 적립(plan)을 Kotlin portfolio 서비스로 · 코치 대화의 주간 계획은 BFF 가 사실로"
priority: medium
labels: [F003, F006, server, db, bff, frontend, slice, msa]
created: 2026-11-26
status: in-progress
---

## Summary

사용자 "새 브랜치 파고 다음 파이프라인 진행" — 마스터 인덱스 §4-1 표가 다 끝나 남은 둘(`SRV-REQ-049` S4 · 11-27 HS 삭제) 중 오늘 할 수 있는 S4.
사용자가 첫 조각을 고름(2026-11-26 "S4a plan 부터 진행"). **동작 변경 0** — 경로 · 응답 · 오류 코드 · 금액이 옛 Express 와 같다(`SRV-REQ-049` Summary).

portfolio 서비스는 Express 에서 market · coach · 내 데이터가 프로세스 안에서 부른다(약 3,000줄). 그중 `plan`(밴드 적립, 2026-11-19 F003 v2)은
남의 컨텍스트를 읽지 않고(예측 뷰만) 소비처가 BFF · 코치 대화 한 곳 · 내 데이터뿐이라 첫 조각으로 떼었다. 보유 · 거래 · 평가는 S4b~.

## 범위

| REQ | 이번 몫(S4a) | 남는 몫 |
|---|---|---|
| `SRV-REQ-049` | FR-1 중 밴드 적립 — Kotlin `services/portfolio`(네 층 · `/api/plan` 다섯 경로) · FR-7 옛 Express `src/plan` 삭제 | FR-1 보유 · 거래 · 평가(S4b~) · FR-2~6(S5~S7) |
| `DB-REQ-036` | 부록 portfolio — `plan_settings` · `weekly_plan_executions` 주인 Prisma → Flyway(`portfolio.V1__baseline`) · 옛 public 표 drop(덤프 `~/salt-backups/…`) · `svc_portfolio` 로그인 · 예측 밴드 뷰 둘 SELECT | portfolio 거래 · 보유 표(S4b) |
| `SRV-REQ-028` · `SRV-REQ-029` | 코치 답 재료 `weeklyPlan` — 조립이 끼우던 포트 → 요청마다 받은 사실(`X-Salt-Weekly-Plan` 헤더) | — |
| `BFF-REQ-027` | 답 스트림 열기 전 `GET /plan/weekly` → 칸만 골라 헤더(400ms 예산 · 실패면 안 싣는다) | — |
| `BFF-REQ-045` | 라우팅 표 `/plan` · `/portfolio/me/data` · `/portfolio/me/data-classification` → platform | — |
| `BFF-REQ-046` | 내 데이터 서비스 목록에 `portfolio`(내보내기 · 지우기 · 저장하는 것) | — |
| `FE-REQ-055` | 서비스 이름표 `portfolio`("투자 적립") 두 곳 — 모르는 키는 그리지 않아 빠지면 지워지는 범위에서 조용히 사라진다 | — |

파일만 걸침(동작 변경 0): `SRV-REQ-020` · `021`(plan 정책 · 경로가 옮겨 간 자리) · `DB-REQ-013`(표 주석) · `FC-REQ-029`(뷰 계약 그대로) ·
`SRV-REQ-043` · `044` · `048` · `062`(플랫폼 설정 · 시험 컨테이너 · identity 요청 제한 이동) · `DB-REQ-017` · `040` · `043`(Express 파일 머리) · `OPS-001` · `OPS-002`(실행 스크립트 · 공용 부품).

## 판단 — 리뷰가 볼 곳

1. **첫 조각을 plan 으로** — portfolio 본체는 market(종가) · coach(보유 · 거래) · 내 데이터가 프로세스 안에서 부른다. 이것부터 옮기면 소비처마다
   내부 REST · 프로젝션이 한꺼번에 생긴다. plan 은 예측 뷰만 읽고 소비처가 셋이라 **은퇴 경로**(`msa-services.md` §7 — 소비처를 같은 PR 에서 다 옮김)가 된다.
2. **그림자 실행을 하지 않았다** — `GET /plan/weekly` 가 읽을 때 빠진 주를 채우는 쓰기를 한다(옛 설계 `syncWeeks` — 월요일 cron 을 놓치는 맥). 그림자로 두 서버가
   같은 요청을 받으면 두 스키마에 스냅샷이 둘 생긴다. 대신 **옛 시험 기대값 그대로**(도메인 50 사례)를 Kotlin 에 옮기고, 응답 키 · 순서 · 오류 코드 · 상세 키를 종단 시험이 본다.
3. **코치 대화 "이번 주 얼마 넣을까"는 BFF 가 사실로** — 코치는 S6 까지 Express. Express 가 Kotlin 을 부르면 서버가 남의 주소를 안다(`msa-services.md` §6, S2c 판단 1 과 같은 이유).
   §5 "남의 값으로 내가 계산한다" 길: BFF 가 스트림을 열기 전 `/plan/weekly` 를 읽어 `X-Salt-Weekly-Plan`(JSON 한 줄 — 자산 · 금액 · 굳음만)으로 싣는다.
   대가: 모든 답 스트림이 계획을 한 번 읽는다(질문 종류는 서버가 고른다 — BFF 는 모른다). 예산 400ms · 실패면 안 싣고 서버가 그 문장만 "불러올 수 없어요".
4. **예측 뷰 권한은 forecast DDL 주인(Prisma)이 준다** — savings 선례(`20261118100000`). roles.sql 은 로그인만. 뷰를 DROP · CREATE 로 다시 만들면 권한이 사라진다 — 마이그레이션 머리에 적었다.
5. **요청 제한 부품을 support 로** — identity 에만 있던 `FixedWindowLimit` 를 plan 쓰기 두 경로(사람마다 분당 30, 옛것과 같다)도 써서 `support/web` 으로 옮겼다. 빈이 둘이 되어 `@Qualifier` 로 꽂는다.
6. **금액 반올림을 정확한 나눗셈 한 번으로** — 옛 decimal.js 20자리 중간값 대신 `divide(…, 0, HALF_UP)` 한 번. 1,000원 경계에 정확히 걸리는 값은 둘 다 유한소수라 같다(옛 기대값 전부 통과).

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| portfolio 보유 · 거래 · 평가 · 리스크 레이더 | market · coach 소비처를 내부 REST · 프로젝션으로 바꾸는 판단이 따로 필요 | S4b~ (`SRV-REQ-049` FR-1) |
| `TransactionRecorded` 발행 | 거래 쓰기가 아직 Express | S4b |

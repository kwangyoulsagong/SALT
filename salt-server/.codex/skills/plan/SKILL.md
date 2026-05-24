---
name: plan
description: "Phase 1: SALT Server 요구사항을 분석하고 API/DB/worker 영향 중심 구현 계획을 수립한다"
argument-hint: <요구사항 파일명 또는 자유 텍스트>
---

# 1단계: 계획 수립

## 컨텍스트

!`cat salt-server/AGENTS.md`
!`find salt-server/.codex/rules -maxdepth 2 -type f -print | sort`
!`find salt-server/src salt-server/prisma -path '*/node_modules' -prune -o -type f \( -name '*.ts' -o -name 'schema.prisma' \) -print | sort`

## 요구사항 입력

`$ARGUMENTS`가 있으면 아래 순서로 요구사항을 결정한다.

1. 파일명: 요구사항 파일이 있으면 그 파일을 읽는다.
2. 인자 없음: 현재 대화 요구사항을 기준으로 한다.
3. 자유 텍스트: 그대로 요구사항으로 사용한다.

## 지시사항

### 1. 요구사항 분해

- 작업을 독립 단위로 나눈다.
- 각 작업에 범위 태그를 붙인다: `[api]`, `[module]`, `[db]`, `[auth]`, `[worker]`, `[external]`, `[docs]`, `[config]`.
- API 계약 변경이면 프론트 영향 여부를 명시한다.

### 2. 배치 결정

- 새 도메인은 `src/modules/{domain}`에 배치한다.
- 공통 설정은 `src/config`, 공통 유틸은 `src/utils`, 외부 API는 `src/external`, 주기 작업은 `src/workers`를 우선한다.
- route/controller/service/dto 책임을 분리한다.

### 3. 영향 분석

- API path/method/request/response/status 변화.
- Zod DTO와 Swagger JSDoc 필요 여부.
- Prisma schema/migration/generate 필요 여부.
- N+1 query, 페이지네이션, index, batch 처리 영향.
- 인증/인가/userId 조건 필요 여부.
- worker 자동 실행, cron, 외부 API rate limit 영향.
- env 추가 여부.

### 4. 구현 계획 출력

```text
## 구현 계획
- [ ] [scope] 작업 설명 — 파일 — 복잡도 small/medium/large

## 리스크
- 리스크 — 대응

## 검증
- 실행할 명령
```

---
name: plan
description: "Phase 1: SALT BFF 요구사항을 분석하고 REST/WS/worker/backend 연동 영향 중심 구현 계획을 수립한다"
argument-hint: <요구사항 파일명 또는 자유 텍스트>
---

# 1단계: 계획 수립

## 컨텍스트

!`cat bff/CLAUDE.md`
!`find bff/.claude/rules -maxdepth 2 -type f -print | sort`
!`find bff/src -path '*/node_modules' -prune -o -type f -name '*.ts' -print | sort`

## 요구사항 입력

`$ARGUMENTS`가 있으면 아래 순서로 요구사항을 결정한다.

1. 파일명: 요구사항 파일이 있으면 그 파일을 읽는다.
2. 인자 없음: 현재 대화 요구사항을 기준으로 한다.
3. 자유 텍스트: 그대로 요구사항으로 사용한다.

## 지시사항

### 1. 요구사항 분해

- 작업을 독립 단위로 나눈다.
- 각 작업에 범위 태그를 붙인다: `[rest]`, `[ws]`, `[worker]`, `[backend]`, `[external]`, `[config]`, `[docs]`.
- 프론트 응답 계약 변경이면 `salt-microFe/**` 영향 여부를 명시한다.
- backend API 호출 계약 변경이면 `salt-server/**` 영향 여부를 명시한다.

### 2. 배치 결정

- REST route는 `src/rest/routes`, controller는 `src/rest/controllers`에 둔다.
- 화면 aggregation과 backend 호출은 `src/services`에 둔다.
- WebSocket connection/session은 `src/websocket/managers`, 메시지 처리는 `src/websocket/handlers`에 둔다.
- 주기 작업은 `src/workers`, 공통 설정은 `src/config`, 공통 유틸은 `src/utils`를 우선한다.

### 3. 영향 분석

- REST path/method/request/response/status 변화.
- WebSocket message type/payload 변화.
- worker interval, 중복 실행, shutdown, 외부 API rate limit 영향.
- backend API path/request/response/header 의존성.
- env 추가 여부.
- 로그/보안/민감 정보 영향.

### 4. 구현 계획 출력

```text
## 구현 계획
- [ ] [scope] 작업 설명 — 파일 — 복잡도 small/medium/large

## 리스크
- 리스크 — 대응

## 검증
- 실행할 명령
```

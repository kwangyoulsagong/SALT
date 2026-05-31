---
name: orchestrate
description: "Phase 2: SALT BFF 구현 계획을 규칙에 맞춰 실행한다"
argument-hint: <계획 또는 작업 설명>
---

# 2단계: 실행

## 컨텍스트

!`cat bff/CLAUDE.md`
!`find bff/.claude/rules -maxdepth 2 -type f -print | sort`

## 실행 원칙

- 작업 전 관련 rule을 읽는다.
- 검색은 `bff/**`에서 `node_modules`, `dist`, `.git`을 제외한다.
- REST 작업은 route/controller/service 책임을 나눠 구현한다.
- backend 연동은 `backend-api.service.ts` 또는 도메인 service에 격리한다.
- WebSocket 작업은 server/handler/manager 책임을 분리한다.
- worker 작업은 import side effect, interval 중복, shutdown 처리를 확인한다.
- 응답 계약이 바뀌면 프론트 영향, backend 호출 계약이 바뀌면 server 영향을 기록한다.

## 완료 조건

- 구현 파일이 기존 BFF 구조와 일관된다.
- TypeScript strict 빌드를 통과할 수 있다.
- REST/WS/worker 실행 경계가 명확하다.
- 필요한 env/config가 반영됐다.

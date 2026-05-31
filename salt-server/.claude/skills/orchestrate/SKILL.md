---
name: orchestrate
description: "Phase 2: SALT Server 구현 계획을 규칙에 맞춰 실행한다"
argument-hint: <계획 또는 작업 설명>
---

# 2단계: 실행

## 컨텍스트

!`cat salt-server/CLAUDE.md`
!`find salt-server/.claude/rules -maxdepth 2 -type f -print | sort`

## 실행 원칙

- 작업 전 관련 rule을 읽는다.
- 검색은 `salt-server/**`에서 `node_modules`, `dist`, `coverage`, `.git`을 제외한다.
- API 작업은 `routes/controller/service/dto` 책임을 나눠 구현한다.
- DB 작업은 Prisma schema, migration, service query를 함께 본다.
- 인증/사용자 소유 데이터는 `authMiddleware`와 `userId` 조건을 확인한다.
- 외부 API/worker 작업은 실패 처리, 로그, 중복 실행 가능성을 확인한다.

## 완료 조건

- 구현 파일이 기존 패턴과 일관된다.
- DTO, Swagger, 응답 형식이 맞다.
- 필요한 env/schema/migration이 반영됐다.
- 가능한 검증 명령을 실행할 수 있는 상태다.

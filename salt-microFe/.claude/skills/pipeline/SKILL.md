---
name: pipeline
description: "SALT MicroFE 전체 파이프라인: plan → orchestrate → validate → deliver → retrospect"
argument-hint: <요구사항 파일명 또는 자유 텍스트>
---

# Development Pipeline

`$ARGUMENTS`를 요구사항 입력으로 사용해 5단계를 순차 실행한다.

## Phase 1: Plan

- 요구사항을 scope별로 분해한다.
- 도메인 폴더 필요 여부를 판단한다.
- API/상태/SSR/MFE/성능 영향을 분석한다.
- MFE 작업이면 remote loading, provider/cache 소유권, shared dependency, type declaration, event bus registry를 계획에 포함한다.
- 구현 계획과 검증 명령을 출력한다.

## Phase 2: Orchestrate

- 계획에 따라 파일을 생성/수정한다.
- app-local 또는 domain-local 구조를 따른다.
- shared package 변경 시 app 의존성을 넣지 않는다.
- browser-only 코드는 SSR-safe하게 격리한다.

## Phase 3: Validate

- 변경 범위에 맞는 lint/build/type check를 실행한다.
- app 간 직접 import, SSR 위험, MFE 계약 변경을 점검한다.
- React.lazy remote 소비, shared 설정 불일치, stale remote type, event bus registry 누락을 점검한다.
- 요구사항 체크리스트를 작성한다.

## Phase 4: Deliver

- export, README/AGENTS/rules 변경 필요성을 확인한다.
- 변경 요약과 커밋 메시지를 제안한다.
- 사용자가 요청하지 않으면 커밋하지 않는다.

## Phase 5: Retrospect

- 도메인 경계, 타입 안전성, SSR/MFE 안정성, 성능, a11y를 리뷰한다.
- 실행 가능한 action item만 기록한다.

## 최종 출력

```text
## Pipeline Result
- Plan:
- Implementation:
- Validation:
- Delivery:
- Retrospective:
- 남은 리스크:
```

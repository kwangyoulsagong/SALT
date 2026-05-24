---
name: plan
description: "Phase 1: SALT MicroFE 요구사항을 분석하고 도메인 중심 구현 계획을 수립한다"
argument-hint: <요구사항 파일명 또는 자유 텍스트>
---

# Phase 1: Plan

## 컨텍스트

!`cat salt-microFe/AGENTS.md`
!`find salt-microFe/apps salt-microFe/packages -maxdepth 3 -type f \( -name '*.ts' -o -name '*.tsx' -o -name 'package.json' -o -name 'next.config.js' \) | sort`

## 요구사항 입력

`$ARGUMENTS`가 있으면 아래 순서로 요구사항을 결정한다.

1. 파일명: `requirements/specs/in-progress/`, `requirements/specs/to-do/`에서 읽는다.
2. `all` 또는 인자 없음: `in-progress`의 모든 요구사항을 읽는다.
3. 자유 텍스트: 그대로 요구사항으로 사용한다.

## 지시사항

### 1. 요구사항 분해

- 작업을 독립 단위로 나눈다.
- 각 작업에 범위 태그를 붙인다: `[shell]`, `[goals]`, `[investments]`, `[ui]`, `[event-bus]`, `[mocks]`, `[shared-config]`.
- 도메인이 필요한 경우 `src/domains/{domain}` 후보를 제안한다.

### 2. 도메인/컴포넌트 배치 결정

- 단일 페이지 전용이면 페이지 하위 컴포넌트 또는 app-local components.
- 특정 비즈니스 도메인에 속하면 `src/domains/{domain}`.
- 두 앱 이상 재사용이면 `packages/ui` 또는 `packages/message-event-bus`.
- route 파일에는 조합만 남기는 계획을 세운다.

### 3. 관리 포인트 식별

요구사항에서 상수화할 값을 분류한다.

```text
## 관리 포인트
- NAME = value — 근거

## 인라인 유지
- value — 근거
```

### 4. API/상태/SSR/MFE 영향 분석

- API endpoint, query key, mutation, cache invalidation 필요 여부.
- Zustand/Redux/URL/event bus 중 어떤 상태 채널을 쓸지.
- SSR 불가 browser API 또는 hydration mismatch 위험.
- Module Federation expose/remotes 변경 여부.

### 4-1. MFE 정비 항목 점검

MFE 관련 작업이면 아래 항목을 계획에 반드시 포함한다.

- shell의 remote 소비가 `React.lazy`인지 `next/dynamic`인지 확인하고 SSR 의도를 명시한다.
- remote별 `QueryClientProvider`를 유지할지, shell 공유 cache로 통합할지 결정한다.
- `@tanstack/react-query`, `@reduxjs/toolkit`, `react-redux`, `zustand` shared 설정을 앱별 격리/싱글톤 중 하나로 맞춘다.
- `transpilePackages`에 존재하지 않는 workspace package가 있는지 확인한다.
- shell `src/types/*.d.ts`가 실제 remote/expose만 선언하는지 확인한다.
- event bus를 쓰면 event name/payload registry 추가 또는 갱신 계획을 포함한다.

### 5. 구현 계획 출력

```text
## Implementation Plan
- [ ] [scope] 작업 설명 — 파일 — 복잡도 small/medium/large

## Risks
- 리스크 — 대응

## Verification
- 실행할 명령
```

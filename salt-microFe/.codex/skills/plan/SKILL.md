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
- 각 작업에 범위 태그를 붙인다: `[web]`, `[web-tax]`, `[ui]`, `[tokens]`, `[core]`, `[mocks]`, `[shared-config]`.
- 도메인이 필요한 경우 `src/domains/{domain}` 후보를 제안한다.

### 2. 도메인/컴포넌트 배치 결정

- 단일 페이지 전용이면 페이지 하위 컴포넌트 또는 app-local components.
- 특정 비즈니스 도메인에 속하면 `src/domains/{domain}`.
- 두 zone 이상 재사용이면 `packages/ui`(웹 UI) · `packages/tokens`(토큰) · `packages/core`(플랫폼 무관 모델·상수).
- route 파일에는 조합만 남기는 계획을 세운다.

### 3. 관리 포인트 식별

요구사항에서 상수화할 값을 분류한다.

```text
## 관리 포인트
- NAME = value — 근거

## 인라인 유지
- value — 근거
```

### 4. API/상태/SSR/zone 영향 분석

- API endpoint, query key, mutation, cache invalidation 필요 여부.
- Zustand/Redux/URL 중 어떤 상태 채널을 쓸지. **zone을 넘으면 URL 또는 서버 상태뿐이다.**
- SSR 불가 browser API 또는 hydration mismatch 위험.
- zone 경계 변경 여부. 새 zone은 `microfrontend.md` §2의 세 조건을 모두 만족해야 한다.

### 4-1. zone 정비 항목 점검

zone 관련 작업이면 아래 항목을 계획에 반드시 포함한다.

- 새 zone이 필요한가. `microfrontend.md` §2의 세 조건(릴리스 주기 · 이동 빈도 · 코드 무게)을 **모두** 만족하는가.
  하나라도 불확실하면 같은 zone의 FSD 슬라이스로 만든다.
- 경로가 zone 간 유일한가. `@repo/core/zones` 레지스트리에 먼저 등록한다.
- default zone `rewrites`와 대상 zone `assetPrefix`가 짝을 이루는가.
- zone을 넘는 링크는 `CrossZoneLink`(=`<a>`)로 계획한다. `<Link>`는 lint에서 막힌다.
- 공유가 필요한 코드는 workspace 패키지로 올린다. **zone이 다른 zone의 `src/**`를 직접 import하지 않는다.**
- `transpilePackages`에 존재하지 않는 workspace package가 있는지 확인한다.

### 5. 구현 계획 출력

```text
## Implementation Plan
- [ ] [scope] 작업 설명 — 파일 — 복잡도 small/medium/large

## Risks
- 리스크 — 대응

## Verification
- 실행할 명령
```
